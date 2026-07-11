import type { SetTimeoutHandle } from "../scheduler/IScheduler.ts";
import { BaseRuntime } from "./BaseRuntime.ts";

/**
 * Base class for a system runtime
 */
export abstract class BaseSystemRuntime<TDate> extends BaseRuntime<TDate> {
  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle {
    return setTimeout(callback, millisecondsDelay);
  }
  clearTimeout(handle: SetTimeoutHandle): void {
    return clearTimeout(handle);
  }
}
