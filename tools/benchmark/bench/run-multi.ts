import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const totalPasses = Number(process.env.TIMEPROVIDER_BENCH_PASSES ?? 5);
const FILES = [
  "bench/manual-scheduling.bench.ts",
  "bench/sequential-scheduling.bench.ts",
  "bench/clock-read.bench.ts",
];
const resultsDirectory = fileURLToPath(new URL("../bench-results", import.meta.url));

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

console.log(`\n=== median across ${totalPasses} passes ===`);
execFileSync("node", ["bench/shared/report.ts"], { stdio: "inherit" });
