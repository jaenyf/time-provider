import type { IdleHandle, IIdleApi } from "./types.ts";

function throwIdleApiNotSupported(): never {
  throw new Error("Environment does not support the Idle Callback API (are you in Safari?)");
}

/**
 * Implements {@link IIdleApi} on top of the host's native
 * `requestIdleCallback`/`cancelIdleCallback`.
 */
export class SystemIdleScheduler implements IIdleApi {
  /**
   * @throws if the host environment does not support `requestIdleCallback`/`cancelIdleCallback`
   * (e.g. Safari, which has no native equivalent).
   */
  constructor() {
    if (typeof requestIdleCallback !== "function") {
      throwIdleApiNotSupported();
    }
    if (typeof cancelIdleCallback !== "function") {
      throwIdleApiNotSupported();
    }
  }

  requestIdleCallback(callback: () => void): IdleHandle {
    return requestIdleCallback(callback);
  }
  cancelIdleCallback(handle: IdleHandle): void {
    cancelIdleCallback(handle);
  }
}
