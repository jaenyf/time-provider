import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ITimerAdapter } from "./adapters/ITimerAdapter.ts";
import type { Scenario } from "./scenarios.ts";
import { BASELINE_SUFFIX } from "./baseline.ts";

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

function runsOnce(adapter: ITimerAdapter, scenario: Scenario): boolean {
  try {
    adapter.setup();
    scenario.run(adapter);
    return true;
  } catch {
    return false;
  } finally {
    adapter.teardown();
  }
}

/**
 * Returns the adapters able to run `scenario`, recording the others as unsupported ("--").
 * A baseline adapter also counts as unsupported when the baseline build throws on the scenario.
 */
export function supportedAdapters<T extends ITimerAdapter>(adapters: T[], scenario: Scenario): T[] {
  return adapters.filter((adapter) => {
    const supported =
      (scenario.requires?.every((member) => adapter[member] !== undefined) ?? true) &&
      (!adapter.name.endsWith(BASELINE_SUFFIX) || runsOnce(adapter, scenario));
    if (!supported) recordSample(adapter.name, scenario.name);
    return supported;
  });
}
