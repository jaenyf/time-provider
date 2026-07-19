/**
 * The intent of this file is to print a comparison table built purely from the realNow-measured samples
 * written to bench-results/*.ndjson
 * These results are independent of vitest/tinybench's own timing, and safe even when each *.bench.ts file ran in its own isolated
 * worker/process.
 * Run after `vitest bench` completes: `node bench/shared/report.ts`
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RESULTS_DIR = fileURLToPath(new URL("../../bench-results/", import.meta.url));

type Sample = { adapter: string; scenario: string; elapsedMs: number; pass?: string };

function readSamples(): Sample[] {
  const samples: Sample[] = [];
  for (const file of readdirSync(RESULTS_DIR)) {
    if (!file.endsWith(".ndjson")) continue;
    for (const line of readFileSync(`${RESULTS_DIR}/${file}`, "utf8").split("\n").filter(Boolean)) {
      samples.push(JSON.parse(line));
    }
  }
  return samples;
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { count: values.length, mean, min: sorted[0], max: sorted.at(-1)! };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sortedValues: number[], p: number): number {
  const index = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1);
  return sortedValues[Math.max(0, index)];
}

const byScenario = new Map<string, Map<string, Map<string, number[]>>>();
for (const { adapter, scenario, elapsedMs, pass = "1" } of readSamples()) {
  const byAdapter = byScenario.get(scenario) ?? byScenario.set(scenario, new Map()).get(scenario)!;
  const byPass = byAdapter.get(adapter) ?? byAdapter.set(adapter, new Map()).get(adapter)!;
  const values = byPass.get(pass) ?? byPass.set(pass, []).get(pass)!;
  values.push(elapsedMs);
}

for (const [scenario, byAdapter] of byScenario) {
  console.log(`\n${scenario}`);
  for (const [adapter, byPass] of byAdapter) {
    const allValues = [...byPass.values()].flat();
    const { count, mean, min, max } = summarize(allValues);
    const passMeans = [...byPass.values()].map(
      (values) => values.reduce((sum, v) => sum + v, 0) / values.length,
    );
    const passSummary =
      byPass.size > 1
        ? `  median-of-${byPass.size}-pass-means=${median(passMeans).toFixed(2)}ms`
        : "";
    console.log(
      `  ${adapter.padEnd(30)} mean=${mean.toFixed(2)}ms  min=${min.toFixed(2)}ms  max=${max.toFixed(2)}ms  (n=${count})${passSummary}`,
    );
  }
}
type Row = {
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

function buildRow(adapter: string, byPass: Map<string, number[]>): Row {
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

function formatVitestStyleTable(
  scenario: string,
  byAdapter: Map<string, Map<string, number[]>>,
): void {
  const rows = [...byAdapter.entries()]
    .map(([adapter, byPass]) => buildRow(adapter, byPass))
    .sort((a, b) => b.hz - a.hz);
  const passCount = Math.max(...[...byAdapter.values()].map((byPass) => byPass.size));

  console.log(`\n ✓ ${scenario} (median across ${passCount} pass${passCount === 1 ? "" : "es"})`);
  console.log(
    "     name".padEnd(31) +
      "hz".padStart(10) +
      "min".padStart(9) +
      "max".padStart(9) +
      "mean".padStart(9) +
      "p75".padStart(9) +
      "p99".padStart(9) +
      "p995".padStart(9) +
      "p999".padStart(9) +
      "rme".padStart(9) +
      "samples".padStart(10),
  );
  for (const row of rows) {
    console.log(
      `   · ${row.adapter.padEnd(27)}` +
        row.hz.toFixed(2).padStart(10) +
        row.min.toFixed(4).padStart(9) +
        row.max.toFixed(4).padStart(9) +
        row.mean.toFixed(4).padStart(9) +
        row.p75.toFixed(4).padStart(9) +
        row.p99.toFixed(4).padStart(9) +
        row.p995.toFixed(4).padStart(9) +
        row.p999.toFixed(4).padStart(9) +
        `±${row.rme.toFixed(2)}%`.padStart(9) +
        String(row.samples).padStart(10),
    );
  }

  if (rows.length > 1) {
    const [fastest, ...rest] = rows;
    console.log(
      `\n BENCH Summary (median across ${passCount} pass${passCount === 1 ? "" : "es"})\n`,
    );
    console.log(`  ${fastest.adapter} - ${scenario}`);
    for (const row of rest) {
      console.log(`    ${(fastest.hz / row.hz).toFixed(2)}x faster than ${row.adapter}`);
    }
  }
}

console.log("\n=== vitest-style table, built from the median of each pass ===");
for (const [scenario, byAdapter] of byScenario) {
  formatVitestStyleTable(scenario, byAdapter);
}
