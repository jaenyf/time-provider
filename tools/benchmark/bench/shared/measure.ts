import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

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

export function recordSample(adapterName: string, scenarioName: string, elapsedMs: number): void {
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
