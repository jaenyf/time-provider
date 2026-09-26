import {
  AddonBase,
  AddonHelper,
  ScheduledHandleKind,
  type IScheduledHandle,
} from "@time-provider/core";
import type { IDeterministicAddon, IDeterministicRuntime } from "@time-provider/core/deterministic";
import type { IDeterministicIdleApi } from "./types.ts";

/**
 * Tag for all entries registered by this addon.
 */
const IDLE_TAG = Symbol("idle");

/**
 * Delay used for `request()` placeholders; they never become due during normal tests.
 */
const FAR_FUTURE_DELAY = { days: 365 * 100 };

/**
 * Implements {@link IDeterministicIdleApi} using the runtime's `specific()` and
 * `takeOutSpecificCallbacks()` APIs.
 *
 * `request()` registers a far-future entry under this addon's tag.
 * `drain(maxCount?)` removes and runs up to `maxCount`, oldest first.
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
      "scheduler.idle",
      { request: this.request.bind(this), drain: this.drain.bind(this) },
      this,
    );
    // The native-shaped aliases, added only when the compat addon is composed before this one.
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "compat.requestIdleCallback",
      this.request.bind(this),
      this,
      true,
    );
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "compat.cancelIdleCallback",
      (handle: IScheduledHandle) => handle.dispose(),
      this,
      true,
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
