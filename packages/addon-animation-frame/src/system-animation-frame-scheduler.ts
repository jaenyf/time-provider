import { AddonBase, type IScheduledHandle, type IRuntime, AddonHelper } from "@time-provider/core";
import type { IAnimationFrameScheduler } from "./types.ts";

function throwAnimationFrameApiNotSupported(): never {
  throw new Error("Environment does not support Animation frame API (are you in a browser?)");
}

class SystemAnimationFrameHandle implements IScheduledHandle {
  readonly #nativeHandle: number;
  #disposed = false;
  #abortController?: AbortController;

  constructor(nativeHandle: number) {
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
    this.#abortController?.abort("Animation frame handle is being disposed");
    cancelAnimationFrame(this.#nativeHandle);
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  get signal(): AbortSignal {
    if (this.#abortController === undefined) {
      this.#abortController = new AbortController();
      if (this.#disposed) {
        this.#abortController.abort("Animation frame handle is being disposed");
      } else {
        this.#abortController.signal.addEventListener("abort", () => this.dispose());
      }
    }
    return this.#abortController.signal;
  }
}

/**
 * Implements {@link IAnimationFrameScheduler} on top of the host's native
 * `requestAnimationFrame`/`cancelAnimationFrame`.
 */
export class SystemAnimationFrameScheduler<TDate>
  extends AddonBase<TDate, IRuntime<TDate>>
  implements IAnimationFrameScheduler<TDate>
{
  #isDisposed: boolean;
  /**
   * @throws if the host environment does not support `requestAnimationFrame`/`cancelAnimationFrame` (e.g. not a browser).
   */
  constructor() {
    super();
    if (typeof requestAnimationFrame !== "function") {
      throwAnimationFrameApiNotSupported();
    }
    if (typeof cancelAnimationFrame !== "function") {
      throwAnimationFrameApiNotSupported();
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
      "scheduler.animation",
      { scheduleFrame: this.scheduleFrame.bind(this) },
      this,
    );
    // The native-shaped aliases, added only when the compat addon is composed before this one.
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "compat.requestAnimationFrame",
      this.scheduleFrame.bind(this),
      this,
      true,
    );
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "compat.cancelAnimationFrame",
      (handle: IScheduledHandle) => handle.dispose(),
      this,
      true,
    );
  }

  scheduleFrame(callback: () => void): IScheduledHandle {
    return new SystemAnimationFrameHandle(requestAnimationFrame(callback));
  }
}
