/**
 * Shared statistics/grouping logic for the realNow-measured samples written to
 * bench-results/*.ndjson. Used by both report.ts (console output) and
 * generate-benchmark-md.ts (BENCHMARK.md changelog entries), so the two never drift apart.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const RESULTS_DIR = fileURLToPath(new URL("../../bench-results/", import.meta.url));

export type Sample = { adapter: string; scenario: string; elapsedMs: number; pass?: string };

// scenario -> adapter -> pass -> elapsedMs[]
export type ScenarioMap = Map<string, Map<string, Map<string, number[]>>>;

export function readSamples(): Sample[] {
  const samples: Sample[] = [];
  for (const file of readdirSync(RESULTS_DIR)) {
    if (!file.endsWith(".ndjson")) continue;
    for (const line of readFileSync(`${RESULTS_DIR}/${file}`, "utf8").split("\n").filter(Boolean)) {
      samples.push(JSON.parse(line));
    }
  }
  return samples;
}

export function groupSamples(samples: Sample[]): ScenarioMap {
  const byScenario: ScenarioMap = new Map();
  for (const { adapter, scenario, elapsedMs, pass = "1" } of samples) {
    const byAdapter =
      byScenario.get(scenario) ?? byScenario.set(scenario, new Map()).get(scenario)!;
    const byPass = byAdapter.get(adapter) ?? byAdapter.set(adapter, new Map()).get(adapter)!;
    const values = byPass.get(pass) ?? byPass.set(pass, []).get(pass)!;
    values.push(elapsedMs);
  }
  return byScenario;
}

export function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { count: values.length, mean, min: sorted[0], max: sorted.at(-1)! };
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(sortedValues: number[], p: number): number {
  const index = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1);
  return sortedValues[Math.max(0, index)];
}

export type Row = {
  adapter: string;
  hz: number;
  min: number;
  max: number;
  mean: number;
  p75: number;
  p99: number;
  p995: number;
  p999: number;
  rme: number;
  samples: number;
};

// Builds one row per adapter, shaped like vitest's own bench table, but with `mean`/`hz` driven by
// the median of each pass's own mean rather than the naive pool-everything-together average - a
// single unusually slow (or fast) pass can't dominate just because it happened to contain more
// individual samples than the others.
export function buildRow(adapter: string, byPass: Map<string, number[]>): Row {
  const allValues = [...byPass.values()].flat();
  const sorted = [...allValues].sort((a, b) => a - b);
  const passMeans = [...byPass.values()].map(
    (values) => values.reduce((sum, v) => sum + v, 0) / values.length,
  );
  const robustMean = median(passMeans);

  const n = allValues.length;
  const variance =
    n > 1 ? allValues.reduce((sum, v) => sum + (v - robustMean) ** 2, 0) / (n - 1) : 0;
  const standardErrorOfMean = Math.sqrt(variance) / Math.sqrt(n);
  // Approximation of tinybench's relative margin of error (1 SEM as a fraction of the mean, not
  // its exact t-distribution confidence interval) - close enough to compare adapters by eye.
  const rme = robustMean > 0 ? (standardErrorOfMean / robustMean) * 100 : 0;

  return {
    adapter,
    hz: robustMean > 0 ? 1000 / robustMean : 0,
    min: sorted[0],
    max: sorted.at(-1)!,
    mean: robustMean,
    p75: percentile(sorted, 75),
    p99: percentile(sorted, 99),
    p995: percentile(sorted, 99.5),
    p999: percentile(sorted, 99.9),
    rme,
    samples: n,
  };
}

export function buildScenarioRows(byAdapter: Map<string, Map<string, number[]>>): Row[] {
  return [...byAdapter.entries()]
    .map(([adapter, byPass]) => buildRow(adapter, byPass))
    .sort((a, b) => b.hz - a.hz);
}

export function passCountFor(byAdapter: Map<string, Map<string, number[]>>): number {
  return Math.max(...[...byAdapter.values()].map((byPass) => byPass.size));
}
