/**
 * The intent of this file is to print a comparison table built purely from the realNow-measured samples
 * written to bench-results/*.ndjson
 * These results are independent of vitest/tinybench's own timing, and safe even when each *.bench.ts file ran in its own isolated
 * worker/process.
 * Run after `vitest bench` completes: `node bench/shared/report.ts`
 */
import {
  buildScenarioRows,
  groupSamples,
  passCountFor,
  readSamples,
  summarize,
  median,
} from "./aggregate.ts";

const byScenario = groupSamples(readSamples());

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

function formatVitestStyleTable(
  scenario: string,
  byAdapter: Map<string, Map<string, number[]>>,
): void {
  const rows = buildScenarioRows(byAdapter);
  const passCount = passCountFor(byAdapter);

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
