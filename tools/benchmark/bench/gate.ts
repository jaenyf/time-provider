/**
 * Runs `passes:N` benchmark passes (default 2) and fails when Time-Provider's lead over another
 * adapter dropped by more than `percentThreshold:N` percent (default 5) against the newest
 * BENCHMARK.md entry, or `competitorBumpPercentThreshold:N` (default 15) when a competitor's
 * version differs from that entry's.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runAllPasses } from "./run-multi.ts";
import { buildScenarioRows, groupSamples, readSamples } from "./shared/aggregate.ts";
import {
  BENCHMARK_MD,
  START_MARKER,
  delta,
  previousRatio,
  previousScenarios,
} from "./shared/previous.ts";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.split(":")));
const content = readFileSync(BENCHMARK_MD, "utf8");
const benchmarkedWith = /^Benchmarked with: (.+)$/m.exec(content.split(START_MARKER)[1] ?? "")?.[1];
const require = createRequire(import.meta.url);
const bumps = ["@sinonjs/fake-timers", "@jest/fake-timers"].flatMap((name) => {
  const before = new RegExp(`${name} (\\S+)`).exec(benchmarkedWith ?? "")?.[1];
  const now: string = require(`${name}/package.json`).version;
  return before && before !== now ? [`${name} ${before} → ${now}`] : [];
});
const maxLoss = Number(
  bumps.length > 0 ? (args.competitorBumpPercentThreshold ?? 15) : (args.percentThreshold ?? 5),
);
if (bumps.length > 0) {
  console.log(
    `Competitor versions changed since the last entry (${bumps.join(", ")}): using ${maxLoss}%.`,
  );
}
runAllPasses(Number(args.passes ?? 2));

const previous = previousScenarios(content);
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
