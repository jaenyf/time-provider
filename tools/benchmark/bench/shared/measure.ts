import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ITimerAdapter } from "./adapters/ITimerAdapter.ts";
import type { Scenario } from "./scenarios.ts";
import { BASELINE_SUFFIX, baselineKit } from "./baseline.ts";
import type { TestContext } from "vite-plus/test";
import { GlobalGuard } from "./globalGuard.ts";
import { realNow } from "./realNow.ts";

const RESULTS_DIR = join(import.meta.dirname, "..", "..", "bench-results");

let resultsDirReady = false;
function ensureResultsDir(): void {
  if (!resultsDirReady) {
    mkdirSync(RESULTS_DIR, { recursive: true });
    resultsDirReady = true;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/*
  Set by run-multi.ts to tag every sample with which independent process invocation it came from,
  so report.ts can tell a real, reproducible effect apart from a single noisy pass.
*/
const currentPass = process.env.TIMEPROVIDER_BENCH_PASS ?? "1";

/**
 * Returns "[NN%] ", the share of the run done when the `index`-th of `count` scenarios starts,
 * from the step run-multi.ts passes, or "" outside it.
 */
export function progress(index: number, count: number): string {
  const { TIMEPROVIDER_BENCH_STEP: step, TIMEPROVIDER_BENCH_STEPS: steps } = process.env;
  if (!step || !steps) return "";
  return `[${Math.floor(((Number(step) + index / count) / Number(steps)) * 100)}%] `;
}

export function recordSample(adapterName: string, scenarioName: string, elapsedMs?: number): void {
  ensureResultsDir();
  const file = join(RESULTS_DIR, `${slugify(adapterName)}.ndjson`);
  const line = JSON.stringify({
    adapter: adapterName,
    scenario: scenarioName,
    elapsedMs,
    pass: currentPass,
  });
  appendFileSync(file, line + "\n");
}

const WARMUP_ROUNDS = 10;

function warmedUp(adapter: ITimerAdapter, scenario: Scenario): boolean {
  try {
    adapter.setup();
    scenario.run(adapter);
    return true;
  } catch (error) {
    if (!adapter.name.endsWith(BASELINE_SUFFIX)) throw error;
    recordSample(adapter.name, scenario.name);
    return false;
  } finally {
    adapter.teardown();
  }
}

/**
 * Returns the adapters able to run `scenario`, recording the others as unsupported ("--"), after
 * running them in turn `WARMUP_ROUNDS` times so every row is timed in the same JIT state. The order
 * is reversed on even passes. A baseline adapter that throws counts as unsupported.
 */
export function prepareAdapters<T extends ITimerAdapter>(adapters: T[], scenario: Scenario): T[] {
  const ordered = Number(currentPass) % 2 === 0 ? adapters.toReversed() : adapters;
  let ready = ordered.filter((adapter) => {
    const supported = scenario.requires?.every((member) => adapter[member] !== undefined) ?? true;
    if (!supported) recordSample(adapter.name, scenario.name);
    return supported;
  });
  for (let round = 0; round < WARMUP_ROUNDS; round++) {
    ready = ready.filter((adapter) => warmedUp(adapter, scenario));
  }
  return ready;
}

const guard = new GlobalGuard();

/**
 * Times the adapters able to run `scenario`, recording each iteration's elapsed time. A lone
 * adapter runs on its own (`bench.compare()` needs two), except in the gate where it has no baseline.
 */
export async function benchAdapters(
  bench: TestContext["bench"],
  adapters: ITimerAdapter[],
  scenario: Scenario,
): Promise<void> {
  const registrations = prepareAdapters(adapters, scenario).map((adapter) =>
    bench(adapter.name, () => {
      adapter.setup();
      const start = realNow();
      try {
        scenario.run(adapter);
      } finally {
        const elapsedMs = realNow() - start;
        adapter.teardown();
        guard.assertPristine(adapter.name);
        recordSample(adapter.name, scenario.name, elapsedMs);
      }
    }),
  );
  if (registrations.length > 1) await bench.compare(...registrations);
  else if (registrations.length === 1 && !baselineKit) await registrations[0].run();
}
