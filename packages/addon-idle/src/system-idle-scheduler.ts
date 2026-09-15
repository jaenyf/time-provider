import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { IIdleApi } from "./types.ts";

type NativeIdleHandle = ReturnType<typeof requestIdleCallback>;

function throwIdleApiNotSupported(): never {
  throw new Error("Environment does not support the Idle Callback API (are you in Safari?)");
}

class SystemIdleHandle implements IScheduledHandle {
  readonly #nativeHandle: NativeIdleHandle;
  #disposed = false;
  #abortController?: AbortController;

  constructor(nativeHandle: NativeIdleHandle) {
    this.#nativeHandle = nativeHandle;
  }

  get isDisposed(): boolean {
    return this.#disposed;
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#abortController?.abort("Idle callback handle is being disposed");
    cancelIdleCallback(this.#nativeHandle);
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  get signal(): AbortSignal {
    if (this.#abortController === undefined) {
      this.#abortController = new AbortController();
      if (this.#disposed) {
        this.#abortController.abort("Idle callback handle is being disposed");
      } else {
        this.#abortController.signal.addEventListener("abort", () => this.dispose());
      }
    }
    return this.#abortController.signal;
  }
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
      { request: this.request.bind(this) },
      this,
    );
  }

  request(callback: () => void): IScheduledHandle {
    return new SystemIdleHandle(requestIdleCallback(callback));
  }
}
