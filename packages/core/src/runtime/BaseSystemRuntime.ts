import type { SetIntervalHandle, SetTimeoutHandle } from "../scheduler/IScheduler.ts";
import { BaseRuntime } from "./BaseRuntime.ts";

/**
 * Base class for a system runtime
 */
export abstract class BaseSystemRuntime<TDate> extends BaseRuntime<TDate> {
  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle {
    if (millisecondsDelay < 0) {
      millisecondsDelay = 0;
    }
    return setTimeout(callback, millisecondsDelay);
  }
  clearTimeout(handle: SetTimeoutHandle): void {
    return clearTimeout(handle);
  }
  setInterval(millisecondsDelay: number, callback: () => void): SetIntervalHandle {
    if (millisecondsDelay < 1) {
      millisecondsDelay = 1;
    }
    return setInterval(callback, millisecondsDelay);
  }
  clearInterval(handle: SetIntervalHandle): void {
    return clearInterval(handle);
  }
}
