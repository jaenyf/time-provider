import {
  AddonBase,
  AddonHelper,
  ScheduledHandleKind,
  type IScheduledHandle,
} from "@time-provider/core";
import type { IDeterministicAddon, IDeterministicRuntime } from "@time-provider/core/deterministic";
import type { IDeterministicIdleApi } from "./types.ts";

/**
 * Tags every entry this addon registers - one constant is enough since `.use()` only ever lets
 * one idle addon compose onto a given runtime (a second `.use(idleAddon)` call fails outright,
 * trying to redefine the same `idle` property).
 */
const IDLE_TAG = Symbol("idle");

/**
 * How far out a `request()`'s placeholder entry is registered - far enough that it never becomes
 * due on its own during a test's lifetime, so only `drain()` ever removes it.
 */
const FAR_FUTURE_DELAY = { days: 365 * 100 };

/**
 * Implements {@link IDeterministicIdleApi} via the runtime's own `specific()`/
 * `takeOutSpecificCallbacks()` capability (see `IDeterministicRuntime` in `@time-provider/core`):
 * `request()` registers a real, far-future-due entry in the shared due-heap under this addon's
 * own tag, and `drain(maxCount?)` retrieves up to `maxCount` of them directly - oldest first -
 * through that tag's own index, without scanning any other pending timer/interval/recurring entry
 * sharing the heap.
 *
 * Every deterministic runtime kind (fixed/manual/sequential) shares the same `specific()`/
 * `takeOutSpecificCallbacks()` implementation and behaves identically here - unlike a design
 * relying on the runtime's own due-draining to fire a placeholder, which a fixed clock disables
 * entirely (see `BaseFixedRuntime.disableDueDraining` in core).
 */
export class DeterministicIdleScheduler<TDate>
  extends AddonBase<TDate, IDeterministicRuntime<TDate>>
  implements IDeterministicAddon<TDate>, IDeterministicIdleApi
{
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

  applyToRuntimeImpl(runtime: IDeterministicRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "idle",
      { request: this.request.bind(this), drain: this.drain.bind(this) },
      this,
    );
  }

  request(callback: () => void): IScheduledHandle {
    return this.runtime.specific(IDLE_TAG, ScheduledHandleKind.timeout, FAR_FUTURE_DELAY, callback);
  }

  drain(maxCount = Number.POSITIVE_INFINITY): number {
    const callbacks = this.runtime.takeOutSpecificCallbacks(IDLE_TAG, maxCount);
    for (const callback of callbacks) callback();
    return callbacks.length;
  }
}
