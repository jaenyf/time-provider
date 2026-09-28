import {
  AddonBase,
  AddonHelper,
  ScheduledHandleKind,
  type IScheduledHandle,
} from "@time-provider/core";
import type { IDeterministicAddon, IDeterministicRuntime } from "@time-provider/core/deterministic";
import type { IDeterministicIdleApi, IIdleDeadline, IIdleRequestOptions } from "./types.ts";

/**
 * Tag for all entries registered by this addon.
 */
const IDLE_TAG = Symbol("idle");

/**
 * Delay used for `request()` placeholders; they never become due during normal tests.
 */
const FAR_FUTURE_DELAY = { days: 365 * 100 };

const IDLE_DEADLINE: IIdleDeadline = Object.freeze({ didTimeout: false, timeRemaining: () => 50 });
const TIMED_OUT_DEADLINE: IIdleDeadline = Object.freeze({
  didTimeout: true,
  timeRemaining: () => 0,
});

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
      {
        request: this.request.bind(this),
        drain: this.drain.bind(this),
        get pendingCount() {
          return runtime.countSpecific(IDLE_TAG);
        },
      },
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

  request(
    callback: (deadline: IIdleDeadline) => void,
    options?: IIdleRequestOptions,
  ): IScheduledHandle {
    let timeoutHandle: IScheduledHandle | undefined;
    const handle = this.runtime.specific(
      IDLE_TAG,
      ScheduledHandleKind.timeout,
      FAR_FUTURE_DELAY,
      () => {
        timeoutHandle?.dispose();
        callback(IDLE_DEADLINE);
      },
    );
    const timeout = options?.timeout ?? 0;
    if (timeout > 0) {
      timeoutHandle = this.runtimeTimers.once(
        { milliseconds: timeout },
        () => {
          handle.dispose();
          callback(TIMED_OUT_DEADLINE);
        },
        { signal: handle.signal },
      );
    }
    return handle;
  }

  get pendingCount(): number {
    return this.runtime.countSpecific(IDLE_TAG);
  }

  drain(maxCount = Number.POSITIVE_INFINITY): number {
    const callbacks = this.runtime.takeOutSpecificCallbacks(IDLE_TAG, maxCount);
    for (const callback of callbacks) callback();
    return callbacks.length;
  }
}
