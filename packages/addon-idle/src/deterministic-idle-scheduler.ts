import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import type { IDeterministicIdleApi } from "./types.ts";

/** The subset of a manual runtime's `advance` this scheduler's placeholder `drain` needs. */
type AdvanceableRuntime = { advance(options: { milliseconds: number }): unknown };

function canAdvance(runtime: unknown): runtime is AdvanceableRuntime {
  return typeof (runtime as { advance?: unknown }).advance === "function";
}

/**
 * Implements {@link IDeterministicIdleApi} on top of a deterministic runtime's own timers: an
 * idle callback is scheduled {@link idleDelay} milliseconds out on that runtime's own clock,
 * rather than waiting for a real host idle period.
 */
export class DeterministicIdleScheduler<TDate>
  extends AddonBase<TDate>
  implements IDeterministicAddon<TDate>, IDeterministicIdleApi
{
  #idleDelay = 1;
  #isDisposed: boolean;
  #pendingCount = 0;

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
      { request: this.request.bind(this), drain: this.drain.bind(this) },
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
    this.#pendingCount++;
    return this.runtime.timers.once({ milliseconds: this.#idleDelay }, () => {
      this.#pendingCount--;
      callback();
    });
  }

  /**
   * PLACEHOLDER implementation - see {@link IDeterministicIdleApi.drain}. Currently just advances
   * the clock by `maxCount` milliseconds (reusing `request`'s existing simulated-delay
   * scheduling to fire whatever becomes due along the way) rather than actually honoring
   * `maxCount` as a callback budget. Only does anything on a manual runtime, since it's the only
   * deterministic strategy with an on-demand `advance()` - a no-op elsewhere (fixed never runs
   * due work at all, and sequential's future instants are fixed up front at construction, not
   * something this can reach in on demand).
   */
  drain(maxCount?: number): number {
    if (!canAdvance(this.runtime)) return 0;
    const before = this.#pendingCount;
    this.runtime.advance({ milliseconds: maxCount ?? this.#idleDelay });
    return before - this.#pendingCount;
  }
}
