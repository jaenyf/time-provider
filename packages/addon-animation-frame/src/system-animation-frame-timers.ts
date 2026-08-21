import type { AnimationFrameHandle, IAnimationFrameApi } from "./types.ts";

function throwAnimationFrameApiNotSupported(): never {
  throw new Error("Environment does not support Animation frame API (are you in a browser?)");
}

/**
 * Implements {@link IAnimationFrameApi} on top of the host's native
 * `requestAnimationFrame`/`cancelAnimationFrame`.
 */
export class SystemAnimationFrameTimers implements IAnimationFrameApi {
  #isDisposed: boolean;
  /**
   * @throws if the host environment does not support `requestAnimationFrame`/`cancelAnimationFrame` (e.g. not a browser).
   */
  constructor() {
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

  requestAnimationFrame(callback: () => void): AnimationFrameHandle {
    return requestAnimationFrame(callback);
  }
  cancelAnimationFrame(handle: AnimationFrameHandle): void {
    cancelAnimationFrame(handle);
  }
}
