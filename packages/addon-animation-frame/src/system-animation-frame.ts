import type { AnimationFrameHandle, IAnimationFrameApi } from "./types.ts";

function throwAnimationFrameApiNotSupported(): never {
  throw new Error("Environment does not support Animation frame API (are you in a browser?)");
}

export class SystemAnimationFrameScheduler implements IAnimationFrameApi {
  constructor() {
    if (typeof requestAnimationFrame !== "function") {
      throwAnimationFrameApiNotSupported();
    }
    if (typeof cancelAnimationFrame !== "function") {
      throwAnimationFrameApiNotSupported();
    }
  }

  requestAnimationFrame(callback: () => void): AnimationFrameHandle {
    return requestAnimationFrame(callback);
  }
  cancelAnimationFrame(handle: AnimationFrameHandle): void {
    cancelAnimationFrame(handle);
  }
}
