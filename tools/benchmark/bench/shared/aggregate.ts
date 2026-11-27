/**
 * Shared statistics/grouping logic for the realNow-measured samples written to
 * bench-results/*.ndjson. Used by both report.ts (console output) and
 * generate-benchmark-md.ts (BENCHMARK.md changelog entries), so the two never drift apart.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const RESULTS_DIR = fileURLToPath(new URL("../../bench-results/", import.meta.url));

/** One line per scenario benched, for run-multi.ts to follow the run's progress. */
export const PROGRESS_LOG = `${RESULTS_DIR}progress.log`;

/** A sample without `elapsedMs` marks the adapter as not supporting the scenario. */
export type Sample = { adapter: string; scenario: string; elapsedMs?: number; pass?: string };

// scenario -> adapter -> pass -> elapsedMs[] (an empty pass map for an unsupported adapter)
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
    if (elapsedMs === undefined) continue;
    const values = byPass.get(pass) ?? byPass.set(pass, []).get(pass)!;
    values.push(elapsedMs);
  }
  return byScenario;
}

export function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, mean: mean(values), min: sorted[0], max: sorted.at(-1)! };
}

export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
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

/** Seeded pseudo-random numbers in [0, 1) (mulberry32), so a gate run's intervals are reproducible. */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bootstrap 95% interval of the percent change in hz from `baseline` to `head`, resampling the
 * samples within each pass and taking the median of pass medians, as the gate's rows do.
 */
export function changeInterval(
  head: Map<string, number[]>,
  baseline: Map<string, number[]>,
): [low: number, high: number] {
  const random = seededRandom(1);
  const gaussian = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  // A resample's median sits at a Beta(n/2, n/2) quantile of the sample, about N(1/2, 1/4n).
  const resampledMedian = (sorted: number[]) => {
    const n = sorted.length;
    const index = Math.floor((0.5 + gaussian() / (2 * Math.sqrt(n))) * n);
    return sorted[Math.min(n - 1, Math.max(0, index))];
  };
  const sortedPasses = (byPass: Map<string, number[]>) =>
    [...byPass.values()].map((values) => values.toSorted((a, b) => a - b));
  const [headPasses, baselinePasses] = [sortedPasses(head), sortedPasses(baseline)];
  const changes = Array.from(
    { length: 2000 },
    () =>
      (median(baselinePasses.map(resampledMedian)) / median(headPasses.map(resampledMedian)) - 1) *
      100,
  ).sort((a, b) => a - b);
  return [percentile(changes, 2.5), percentile(changes, 97.5)];
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
// the median of each pass's own `center` (mean by default) rather than the naive pool-everything-together average - a
// single unusually slow (or fast) pass can't dominate just because it happened to contain more
// individual samples than the others.
export function buildRow(
  adapter: string,
  byPass: Map<string, number[]>,
  center: (values: number[]) => number = mean,
): Row {
  const allValues = [...byPass.values()].flat();
  const sorted = [...allValues].sort((a, b) => a - b);
  const robustMean = median([...byPass.values()].map(center));

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

export function buildScenarioRows(
  byAdapter: Map<string, Map<string, number[]>>,
  center?: (values: number[]) => number,
): Row[] {
  return [...byAdapter.entries()]
    .filter(([, byPass]) => byPass.size > 0)
    .map(([adapter, byPass]) => buildRow(adapter, byPass, center))
    .sort((a, b) => b.hz - a.hz);
}

export function unsupportedAdapters(byAdapter: Map<string, Map<string, number[]>>): string[] {
  return [...byAdapter.entries()]
    .filter(([, byPass]) => byPass.size === 0)
    .map(([adapter]) => adapter);
}

export function passCountFor(byAdapter: Map<string, Map<string, number[]>>): number {
  return Math.max(...[...byAdapter.values()].map((byPass) => byPass.size));
}
