import type { ITimerAdapter } from "./ITimerAdapter.ts";

// Captured before any library under test can fake it.
const realSetImmediate = setImmediate;

/** A timeout cleared when `signal` aborts, the way code without signal support does it. */
export function timeoutWithSignal(
  adapter: ITimerAdapter,
  callback: () => void,
  delayMs: number,
  signal: AbortSignal,
): void {
  const handle = adapter.setTimeout(callback, delayMs);
  signal.addEventListener("abort", () => adapter.clearTimeout!(handle), { once: true });
}

/** A timeout scheduling itself again after each call's returned delay, until it returns `false`. */
export function recurringTimeout(
  adapter: ITimerAdapter,
  callback: () => number | false,
  initialDelayMs: number,
): void {
  const tick = () => {
    const delayMs = callback();
    if (delayMs !== false) adapter.setTimeout(tick, delayMs);
  };
  adapter.setTimeout(tick, initialDelayMs);
}

/** Fires timers one at a time until none is pending, yielding to the host after each, as sinon's runAllAsync() does. */
export async function runAllAsync(pendingCount: () => number, fireNext: () => void): Promise<void> {
  while (pendingCount() > 0) {
    fireNext();
    await new Promise((resolve) => realSetImmediate(resolve));
  }
}
