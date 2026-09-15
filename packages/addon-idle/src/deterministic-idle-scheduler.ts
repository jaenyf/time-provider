import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import type { IIdleApi } from "./types.ts";

/**
 * Implements {@link IIdleApi} on top of a deterministic runtime's own timers: an idle callback is
 * scheduled {@link idleDelay} milliseconds out on that runtime's own clock, rather than waiting
 * for a real host idle period.
 */
export class DeterministicIdleScheduler<TDate>
  extends AddonBase<TDate>
  implements IDeterministicAddon<TDate>, IIdleApi
{
  #idleDelay = 1;
  #isDisposed: boolean;

  constructor() {
    super();
    this.#isDisposed = false;
  }

  dispose(): void {
    this.#isDisposed = true;
  }
  get isDisposed(): boolean {
    return this.#isDisposed;
  }
  [Symbol.dispose](): void {
    this.dispose();
  }

  applyToRuntimeImpl(runtime: IRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "idle",
      { request: this.request.bind(this) },
      this,
    );
  }

  /**
   * The simulated delay, in milliseconds, standing in for an idle period on a deterministic
   * runtime: a callback registered with `request` runs once this runtime's clock has moved that
   * far forward. Raise it to push idle work further behind the timeouts the code under test
   * schedules.
   *
   * Defaults to 1ms rather than 0 so that an idle callback always lands *after* the work already
   * due at the current instant - a deterministic runtime drains a 0ms delay in-line, so a 0
   * default would run the callback synchronously from `request` itself, which is the one thing an
   * idle callback should never do.
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

  request(callback: () => void): IScheduledHandle {
    return this.runtime.timers.once({ milliseconds: this.#idleDelay }, callback);
  }
}
