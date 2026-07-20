import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { SetIntervalHandle, SetTimeoutHandle } from "../scheduler/IScheduler.ts";
import type { ITimeConverter } from "./ITimeConverter.ts";
import { BaseRuntime } from "./BaseRuntime.ts";

/**
 * Base class for a system runtime
 */
export abstract class BaseSystemRuntime<TDate> extends BaseRuntime<TDate> {
  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    super(localTimezone, converter);
  }

  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle {
    if (millisecondsDelay === undefined || millisecondsDelay < 0) {
      millisecondsDelay = 0;
    }
    return setTimeout(callback, millisecondsDelay);
  }
  clearTimeout(handle: SetTimeoutHandle): void {
    return clearTimeout(handle);
  }
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle {
    if (millisecondsDelay === undefined || millisecondsDelay < 1) {
      millisecondsDelay = 1;
    }
    return setInterval(callback, millisecondsDelay);
  }
  clearInterval(handle: SetIntervalHandle): void {
    return clearInterval(handle);
  }
}
