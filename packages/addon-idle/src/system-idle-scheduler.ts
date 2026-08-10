import { AddonBase, AddonHelper, type IRuntime } from "@time-provider/core";
import type { IdleHandle, IIdleApi } from "./types.ts";

function throwIdleApiNotSupported(): never {
  throw new Error("Environment does not support the Idle Callback API (are you in Safari?)");
}

/**
 * Implements {@link IIdleApi} on top of the host's native
 * `requestIdleCallback`/`cancelIdleCallback`.
 */
export class SystemIdleScheduler<TDate> extends AddonBase<TDate> implements IIdleApi {
  #isDisposed: boolean;

  /**
   * @throws if the host environment does not support `requestIdleCallback`/`cancelIdleCallback`
   * (e.g. Safari, which has no native equivalent).
   */
  constructor() {
    super();
    if (typeof requestIdleCallback !== "function") {
      throwIdleApiNotSupported();
    }
    if (typeof cancelIdleCallback !== "function") {
      throwIdleApiNotSupported();
    }
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
      {
        requestIdleCallback: this.requestIdleCallback.bind(this),
        cancelIdleCallback: this.cancelIdleCallback.bind(this),
      },
      this,
    );
  }

  requestIdleCallback(callback: () => void): IdleHandle {
    return requestIdleCallback(callback);
  }
  cancelIdleCallback(handle: IdleHandle): void {
    cancelIdleCallback(handle);
  }
}
