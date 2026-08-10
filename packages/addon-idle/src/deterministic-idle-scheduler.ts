import type { DueHandle, IScheduler } from "@time-provider/core";
import type { IdleHandle, IIdleApi } from "./types.ts";

/**
 * Implements {@link IIdleApi} on top of a deterministic runtime's {@link IScheduler}: an idle
 * callback is scheduled {@link idleDelay} milliseconds out on that runtime's own clock, rather
 * than waiting for a real host idle period.
 */
export class DeterministicIdleScheduler implements IIdleApi {
  #idleDelay = 1;
  #scheduler: IScheduler;

  /**
   * @param scheduler the deterministic runtime's scheduler used to simulate idle callbacks.
   */
  constructor(scheduler: IScheduler) {
    this.#scheduler = scheduler;
  }

  /**
   * The simulated delay, in milliseconds, standing in for an idle period on a deterministic
   * runtime: a callback registered with `requestIdleCallback` runs once this runtime's clock has
   * moved that far forward. Raise it to push idle work further behind the timeouts the code
   * under test schedules.
   *
   * Defaults to 1ms rather than 0 so that an idle callback always lands *after* the work already
   * due at the current instant - a deterministic runtime drains a 0ms delay in-line, so a 0
   * default would run the callback synchronously from `requestIdleCallback` itself, which is the
   * one thing an idle callback should never do.
   */
  get idleDelay(): number {
    return this.#idleDelay;
  }
  /**
   * The simulated delay, in milliseconds, standing in for an idle period on a deterministic
   * runtime. A negative value (or `NaN`) is clamped to 0 - and 0 means the callback runs in-line,
   * exactly as `setTimeout(callback, 0)` does on a deterministic runtime.
   */
  set idleDelay(value: number) {
    this.#idleDelay = value > 0 ? value : 0;
  }

  requestIdleCallback(callback: () => void): IdleHandle {
    return this.#scheduler.setTimeout(callback, this.#idleDelay) as unknown as IdleHandle;
  }
  cancelIdleCallback(handle: IdleHandle): void {
    this.#scheduler.clearTimeout(handle as unknown as DueHandle);
  }
}
