import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ITimerAdapter } from "./adapters/ITimerAdapter.ts";
import type { Scenario } from "./scenarios.ts";
import { BASELINE_SUFFIX, baselineKit } from "./baseline.ts";
import type { TestContext } from "vite-plus/test";
import { GlobalGuard } from "./globalGuard.ts";
import { realNow } from "./realNow.ts";
import { timeLeft } from "./timeLeft.ts";
import { PROGRESS_LOG } from "./aggregate.ts";

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
 * Returns "[NN%, ~M min left] ", the share of the run done and the time left when the `index`-th of
 * `count` scenarios starts, from the step and estimates run-multi.ts passes ("estimating" until it
 * has some), or "" outside it.
 */
export function progress(index: number, count: number): string {
  const {
    TIMEPROVIDER_BENCH_STEP: step,
    TIMEPROVIDER_BENCH_STEPS: steps,
    TIMEPROVIDER_BENCH_LEFT_MS: leftMs,
  } = process.env;
  if (!step || !steps) return "";
  const percent = Math.floor(((Number(step) + index / count) / Number(steps)) * 100);
  const left = leftMs ? timeLeft((JSON.parse(leftMs) as number[])[index]) : "estimating";
  return `[${percent}%, ${left}] `;
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

const { gc } = globalThis;
if (!gc) throw new Error('GC is not exposed, did you forget to run with "--expose-gc"?');
const collectGarbage = () => gc();

/** Records a baseline adapter that throws as unsupported; rethrows for any other adapter. */
function unsupported(adapter: ITimerAdapter, scenario: Scenario, error: unknown): false {
  if (!adapter.name.endsWith(BASELINE_SUFFIX)) throw error;
  recordSample(adapter.name, scenario.name);
  return false;
}

function warmedUp(adapter: ITimerAdapter, scenario: Scenario & { async?: false }): boolean {
  try {
    adapter.setup();
    scenario.run(adapter);
    return true;
  } catch (error) {
    return unsupported(adapter, scenario, error);
  } finally {
    adapter.teardown();
  }
}

async function warmedUpAsync(
  adapter: ITimerAdapter,
  scenario: Scenario & { async: true },
): Promise<boolean> {
  try {
    adapter.setup();
    await scenario.run(adapter);
    return true;
  } catch (error) {
    return unsupported(adapter, scenario, error);
  } finally {
    adapter.teardown();
  }
}

/**
 * Returns the adapters able to run `scenario`, recording the others as unsupported ("--"), after
 * running them in turn `WARMUP_ROUNDS` times so every row is timed in the same JIT state, then
 * collecting garbage. The order is reversed on even passes. A baseline adapter that throws counts
 * as unsupported.
 */
async function prepareAdapters<T extends ITimerAdapter>(
  adapters: T[],
  scenario: Scenario,
): Promise<T[]> {
  const ordered = Number(currentPass) % 2 === 0 ? adapters.toReversed() : adapters;
  let ready = ordered.filter((adapter) => {
    const supported = scenario.requires?.every((member) => adapter[member] !== undefined) ?? true;
    if (!supported) recordSample(adapter.name, scenario.name);
    return supported;
  });
  for (let round = 0; round < WARMUP_ROUNDS; round++) {
    if (!scenario.async) {
      ready = ready.filter((adapter) => warmedUp(adapter, scenario));
      continue;
    }
    const warm = [];
    for (const adapter of ready) if (await warmedUpAsync(adapter, scenario)) warm.push(adapter);
    ready = warm;
  }
  collectGarbage();
  return ready;
}

const guard = new GlobalGuard();

/**
 * Times the adapters able to run `scenario`, recording each iteration's elapsed time, awaited for an
 * async scenario, and collecting garbage after each row's warm-up and run phases. A lone adapter runs on its own
 * (`bench.compare()` needs two), except in the gate where it has no baseline.
 */
export async function benchAdapters(
  bench: TestContext["bench"],
  adapters: ITimerAdapter[],
  scenario: Scenario,
): Promise<void> {
  const finish = (adapter: ITimerAdapter, start: number) => {
    const elapsedMs = realNow() - start;
    adapter.teardown();
    guard.assertPristine(adapter.name);
    recordSample(adapter.name, scenario.name, elapsedMs);
  };
  const registrations = (await prepareAdapters(adapters, scenario)).map((adapter) =>
    scenario.async
      ? bench(adapter.name, { async: true, afterAll: collectGarbage }, async () => {
          adapter.setup();
          const start = realNow();
          try {
            await scenario.run(adapter);
          } finally {
            finish(adapter, start);
          }
        })
      : bench(adapter.name, { afterAll: collectGarbage }, () => {
          adapter.setup();
          const start = realNow();
          try {
            scenario.run(adapter);
          } finally {
            finish(adapter, start);
          }
        }),
  );
  if (registrations.length > 1) await bench.compare(...registrations);
  else if (registrations.length === 1 && !baselineKit) await registrations[0].run();
  ensureResultsDir();
  appendFileSync(PROGRESS_LOG, scenario.name + "\n");
}
