/**
 * The intent of this file is to ensure benchmarked libraries do not leak undisposed fake timers across benchmarks.
 */
const GUARDED_KEYS = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "Date",
  "performance",
] as const;

type GuardedKey = (typeof GUARDED_KEYS)[number];
type Snapshot = Record<GuardedKey, unknown>;

function snapshot(): Snapshot {
  const result = {} as Snapshot;
  for (const key of GUARDED_KEYS) {
    result[key] = (globalThis as Record<string, unknown>)[key];
  }
  return result;
}

export class GlobalGuard {
  #baseline: Snapshot;

  constructor() {
    this.#baseline = snapshot();
  }

  assertPristine(adapterName: string): void {
    const current = snapshot();
    for (const key of GUARDED_KEYS) {
      if (current[key] !== this.#baseline[key]) {
        throw new Error(
          `'${adapterName}'.teardown() left globalThis.${key} patched - a fake-timers library leaked into the next benchmark.`,
        );
      }
    }
  }
}
