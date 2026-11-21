/**
 * Runs one benchmark pass and fails when Time-Provider's lead over another adapter dropped by more
 * than the given percentage (first argument, default 5) against the newest BENCHMARK.md entry.
 */
import { readFileSync } from "node:fs";
import { runAllPasses } from "./run-multi.ts";
import { buildScenarioRows, groupSamples, readSamples } from "./shared/aggregate.ts";
import { BENCHMARK_MD, delta, previousRatio, previousScenarios } from "./shared/previous.ts";

const maxLoss = Number(process.argv[2] ?? 5);
runAllPasses(1);

const previous = previousScenarios(readFileSync(BENCHMARK_MD, "utf8"));
const losses: string[] = [];
for (const [scenario, byAdapter] of groupSamples(readSamples())) {
  const rows = buildScenarioRows(byAdapter);
  const best = rows.find((row) => row.adapter.startsWith("time-provider"));
  if (!best) continue;
  for (const row of rows.filter((row) => !row.adapter.startsWith("time-provider"))) {
    const ratio = best.hz / row.hz;
    const before = previousRatio(previous.get(scenario), best.adapter, row.adapter);
    if (before && Number(((ratio / before - 1) * 100).toFixed(1)) < -maxLoss) {
      losses.push(
        `${scenario}: ${best.adapter} ${ratio.toFixed(2)}x faster than ${row.adapter}${delta(ratio, before)}`,
      );
    }
  }
}

if (losses.length > 0) {
  console.error(
    `\nBenchmark ratios lost more than ${maxLoss}%:\n${losses.map((loss) => `- ${loss}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(`\nNo benchmark ratio lost more than ${maxLoss}%.`);
