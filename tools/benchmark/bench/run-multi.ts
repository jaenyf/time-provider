import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon as etaAddon, type IEtaProgressSnapshot } from "@time-provider/addon-eta";
import { args } from "./shared/args.ts";
import { PROGRESS_LOG } from "./shared/aggregate.ts";
import {
  asyncScenarios,
  clockReadScenarios,
  schedulingScenarios,
  type Scenario,
} from "./shared/scenarios.ts";
import { timeLeft } from "./shared/timeLeft.ts";

/*
  The intent of this file is to run the whole bench suite as `totalPasses` independent process invocations.
  Fresh V8/JIT/GC state each time, tagging every recorded sample with which pass it came from via TIMEPROVIDER_BENCH_PASS.
  It is exported for generate-benchmark-md.ts.
*/
const FILES: Record<string, [label: string, scenarios: Scenario[]]> = {
  "bench/manual-scheduling.bench.ts": [
    "time-provider (manual) vs competitors",
    schedulingScenarios,
  ],
  "bench/sequential-scheduling.bench.ts": [
    "time-provider (sequential) vs competitors",
    schedulingScenarios,
  ],
  "bench/compat-scheduling.bench.ts": [
    "time-provider (compat) vs competitors",
    schedulingScenarios,
  ],
  "bench/async-scheduling.bench.ts": [
    "time-provider (manual) async vs competitors",
    asyncScenarios,
  ],
  "bench/clock-read.bench.ts": [
    "time-provider (manual) clock reads vs competitors",
    clockReadScenarios,
  ],
  "bench/fixed-clock-read.bench.ts": [
    "time-provider (fixed) clock reads vs competitors",
    clockReadScenarios,
  ],
  "bench/compat-clock-read.bench.ts": [
    "time-provider (compat) clock reads vs competitors",
    clockReadScenarios,
  ],
};
const resultsDirectory = fileURLToPath(new URL("../bench-results", import.meta.url));

/** Runs `vp` with `vpArgs`, sharing this process's output, and rejects if it fails. */
function vp(vpArgs: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn("vp", vpArgs, { stdio: "inherit", env })
      .on("error", reject)
      .on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`vp ${vpArgs.join(" ")} exited with ${code}`)),
      );
  });
}

/** Number of scenarios the bench files have reported done. */
function scenariosDone(): number {
  return existsSync(PROGRESS_LOG) ? readFileSync(PROGRESS_LOG, "utf8").split("\n").length - 1 : 0;
}

/** The time left when each of `scenarios` starts, counting only those `pattern` lets run. */
function leftByScenario(
  scenarios: Scenario[],
  pattern: RegExp | undefined,
  leftMs: number,
  msPerScenario: number,
): number[] {
  let ran = 0;
  return scenarios.map(({ name }) => {
    const left = Math.max(leftMs - ran * msPerScenario, 0);
    if (pattern?.test(name) ?? true) ran++;
    return left;
  });
}

/**
 * Runs the suite `totalPasses` times, only the tests whose name matches `testNamePattern` if given
 * (skipping the files with none), estimating the time left with Time-Provider's ETA addon.
 */
export async function runAllPasses(totalPasses: number, testNamePattern?: string): Promise<void> {
  rmSync(resultsDirectory, { recursive: true, force: true });
  const pattern = testNamePattern ? new RegExp(testNamePattern) : undefined;
  const files = Object.entries(FILES).filter(([, [, scenarios]]) =>
    scenarios.some(({ name }) => pattern?.test(name) ?? true),
  );
  const steps = totalPasses * files.length;
  const scenarioCount = files.reduce(
    (sum, [, [, scenarios]]) =>
      sum + scenarios.filter(({ name }) => pattern?.test(name) ?? true).length,
    0,
  );
  const timeProvider = createTimeProvider.for(plugin).use(etaAddon).create();
  let estimate: IEtaProgressSnapshot | undefined;
  const tracker = timeProvider.eta
    .estimate()
    .withKnownTotal(totalPasses * scenarioCount)
    .withAlgorithm("complete")
    .start((snapshot) => (estimate = snapshot));
  timeProvider.scheduler.timers.every({ seconds: 1 }, () => tracker.progressTo(scenariosDone()));
  try {
    for (let pass = 1; pass <= totalPasses; pass++) {
      for (const [index, [file, [label, scenarios]]] of files.entries()) {
        const step = (pass - 1) * files.length + index;
        const leftMs = estimate?.remainingMilliseconds;
        const left = leftMs === undefined ? "estimating" : timeLeft(leftMs);
        console.log(
          `\n--- [pass ${pass}/${totalPasses}] (${Math.floor((step / steps) * 100)}%, ${left}) ${process.env.TIMEPROVIDER_BENCH_BASELINE ? label.replace("competitors", "baseline") : label} ---`,
        );
        const filter = testNamePattern ? ["-t", testNamePattern] : [];
        await vp(["test", "bench", "--reporter=verbose", ...filter, file], {
          ...process.env,
          TIMEPROVIDER_BENCH_PASS: String(pass),
          TIMEPROVIDER_BENCH_STEP: String(step),
          TIMEPROVIDER_BENCH_STEPS: String(steps),
          ...(leftMs !== undefined &&
            estimate!.completed > 0 && {
              TIMEPROVIDER_BENCH_LEFT_MS: JSON.stringify(
                leftByScenario(
                  scenarios,
                  pattern,
                  leftMs,
                  estimate!.elapsedMilliseconds / estimate!.completed,
                ),
              ),
            }),
        });
      }
    }
    tracker.done();
  } finally {
    timeProvider.dispose();
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const totalPasses = Number(args.passes ?? 5);
  await runAllPasses(totalPasses);
  console.log(`\n=== median across ${totalPasses} passes ===`);
  execFileSync("node", ["bench/shared/report.ts"], { stdio: "inherit" });
}
