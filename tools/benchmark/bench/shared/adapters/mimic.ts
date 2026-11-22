import type { ITimerAdapter } from "./ITimerAdapter.ts";

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
