import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { args } from "./shared/args.ts";

/*
  The intent of this file is to run the whole bench suite as `totalPasses` independent process invocations.
  Fresh V8/JIT/GC state each time, tagging every recorded sample with which pass it came from via TIMEPROVIDER_BENCH_PASS.
  It is exported for generate-benchmark-md.ts.
*/
const FILES = {
  "bench/manual-scheduling.bench.ts": "time-provider (manual) vs competitors",
  "bench/sequential-scheduling.bench.ts": "time-provider (sequential) vs competitors",
  "bench/compat-scheduling.bench.ts": "time-provider (compat) vs competitors",
  "bench/async-scheduling.bench.ts": "time-provider (manual) async vs competitors",
  "bench/clock-read.bench.ts": "time-provider (manual) clock reads vs competitors",
  "bench/fixed-clock-read.bench.ts": "time-provider (fixed) clock reads vs competitors",
  "bench/compat-clock-read.bench.ts": "time-provider (compat) clock reads vs competitors",
};
const resultsDirectory = fileURLToPath(new URL("../bench-results", import.meta.url));

/** Runs the suite `totalPasses` times, only the tests whose name matches `testNamePattern` if given. */
export function runAllPasses(totalPasses: number, testNamePattern?: string): void {
  rmSync(resultsDirectory, { recursive: true, force: true });
  const files = Object.entries(FILES);
  const steps = totalPasses * files.length;
  for (let pass = 1; pass <= totalPasses; pass++) {
    for (const [index, [file, label]] of files.entries()) {
      const step = (pass - 1) * files.length + index;
      console.log(
        `\n--- [pass ${pass}/${totalPasses}] (${Math.floor((step / steps) * 100)}%) ${process.env.TIMEPROVIDER_BENCH_BASELINE ? label.replace("competitors", "baseline") : label} ---`,
      );
      const filter = testNamePattern ? ["-t", testNamePattern] : [];
      execFileSync("vp", ["test", "bench", "--reporter=verbose", ...filter, file], {
        stdio: "inherit",
        env: {
          ...process.env,
          TIMEPROVIDER_BENCH_PASS: String(pass),
          TIMEPROVIDER_BENCH_STEP: String(step),
          TIMEPROVIDER_BENCH_STEPS: String(steps),
        },
      });
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const totalPasses = Number(args.passes ?? 5);
  runAllPasses(totalPasses);
  console.log(`\n=== median across ${totalPasses} passes ===`);
  execFileSync("node", ["bench/shared/report.ts"], { stdio: "inherit" });
}
