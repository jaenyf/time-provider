import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
  The intent of this file is to run the whole bench suite as `totalPasses` independent process invocations.
  Fresh V8/JIT/GC state each time, tagging every recorded sample with which pass it came from via TIMEPROVIDER_BENCH_PASS.
  It is exported for generate-benchmark-md.ts.
*/
const FILES = [
  "bench/manual-scheduling.bench.ts",
  "bench/sequential-scheduling.bench.ts",
  "bench/clock-read.bench.ts",
];
const resultsDirectory = fileURLToPath(new URL("../bench-results", import.meta.url));

export function runAllPasses(totalPasses: number): void {
  rmSync(resultsDirectory, { recursive: true, force: true });
  for (let pass = 1; pass <= totalPasses; pass++) {
    console.log(`\n=== pass ${pass}/${totalPasses} ===`);
    for (const file of FILES) {
      execFileSync("vitest", ["bench", file], {
        stdio: "inherit",
        env: { ...process.env, TIMEPROVIDER_BENCH_PASS: String(pass) },
      });
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const totalPasses = Number(process.env.TIMEPROVIDER_BENCH_PASSES ?? 5);
  runAllPasses(totalPasses);
  console.log(`\n=== median across ${totalPasses} passes ===`);
  execFileSync("node", ["bench/shared/report.ts"], { stdio: "inherit" });
}
