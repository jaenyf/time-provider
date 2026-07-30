import type { AnimationFrameHandle, IAnimationFrameScheduler } from "./types.ts";

function throwAnimationFrameApiNotSupported(): never {
  throw new Error("Environment does not support Animation frame API (are you in a browser?)");
}

export class SystemAnimationFrameScheduler implements IAnimationFrameScheduler {
  private readonly _environmentChecked: boolean = false;
  constructor() {
    this._environmentChecked = true;
    if (typeof requestAnimationFrame !== "function") {
      this._environmentChecked = false;
    }
    if (typeof cancelAnimationFrame !== "function") {
      this._environmentChecked = false;
    }
  }

  requestAnimationFrame(callback: () => void): AnimationFrameHandle {
    if (this._environmentChecked) {
      return requestAnimationFrame(callback);
    }
    return throwAnimationFrameApiNotSupported();
  }
  cancelAnimationFrame(handle: AnimationFrameHandle): void {
    if (this._environmentChecked) {
      cancelAnimationFrame(handle);
      return;
    }
    throwAnimationFrameApiNotSupported();
  }
}
