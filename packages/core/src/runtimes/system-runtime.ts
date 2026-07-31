import { SystemPerformance } from "../performance/system-performance.ts";
import type {
  ITimeConverter,
  SetIntervalHandle,
  SetTimeoutHandle,
  TimezoneDefinition,
} from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

/**
 * Base class for a system runtime
 */
export abstract class BaseSystemRuntime<TDate> extends BaseRuntime<TDate> {
  /**
   * @param localTimezone the local timezone this runtime is configured with.
   * @param converter the time converter for this runtime's date library, provided by the concrete subclass.
   */
  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    super(localTimezone, converter, new SystemPerformance());
  }

  /**
   * Schedules `callback` via the native `setTimeout`.
   */
  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle {
    if (millisecondsDelay === undefined || millisecondsDelay < 0) {
      millisecondsDelay = 0;
    }
    return setTimeout(callback, millisecondsDelay);
  }
  /**
   * Cancels a pending timeout via the native `clearTimeout`.
   */
  clearTimeout(handle: SetTimeoutHandle): void {
    return clearTimeout(handle);
  }
  /**
   * Schedules `callback` via the native `setInterval`.
   */
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle {
    if (millisecondsDelay === undefined || millisecondsDelay < 1) {
      millisecondsDelay = 1;
    }
    return setInterval(callback, millisecondsDelay);
  }
  /**
   * Cancels a pending interval via the native `clearInterval`.
   */
  clearInterval(handle: SetIntervalHandle): void {
    return clearInterval(handle);
  }
}
