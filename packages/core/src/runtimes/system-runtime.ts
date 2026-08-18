import { SystemPerformance } from "../performance/system-performance.ts";
import type {
  DurationMilliseconds,
  EpochMilliseconds,
  ITimeConverter,
  ITimerHandle,
  ITimerOptions,
  TimezoneDefinition,
} from "../types/types.ts";
import { TIMER_KIND_INTERVAL, TIMER_KIND_RECURRING, TIMER_KIND_TIMEOUT } from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";
import { TimerHandle } from "./timer-handle.ts";

type ReturnTypeOfSetInterval = ReturnType<typeof setInterval>;
type ReturnTypeOfSetTimeout = ReturnType<typeof setTimeout>;
// oxlint-disable-next-line typescript/no-duplicate-type-constituents
type ReturnTypeOfTimer = ReturnTypeOfSetInterval | ReturnTypeOfSetTimeout;

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

  clearTimer<TNativeHandle>(handle: TimerHandle<TDate, TNativeHandle>): void;
  clearTimer<TNativeHandle extends ReturnTypeOfTimer>(
    handle: TimerHandle<TDate, TNativeHandle>,
  ): void {
    switch (handle.kind) {
      case TIMER_KIND_INTERVAL:
        clearInterval(handle.nativeHandle);
        break;
      case TIMER_KIND_RECURRING:
        clearTimeout(handle.nativeHandle);
        break;
      case TIMER_KIND_TIMEOUT:
        clearTimeout(handle.nativeHandle);
        break;
      default:
        throw new Error("Invalid operation");
    }
  }

  once(delay: DurationMilliseconds, callback: () => void, _options?: ITimerOptions) {
    if (delay === undefined || delay < 0) {
      delay = 0 as DurationMilliseconds;
    }
    return new TimerHandle(TIMER_KIND_TIMEOUT, this, setTimeout(callback, delay));
  }

  every(delay: DurationMilliseconds, callback: () => void, _options?: ITimerOptions): ITimerHandle {
    if (delay === undefined || delay < 1) {
      delay = 1 as DurationMilliseconds;
    }
    return new TimerHandle(TIMER_KIND_INTERVAL, this, setInterval(callback, delay));
  }

  recurring(
    callback: () => DurationMilliseconds | false,
    initialDelay?: DurationMilliseconds,
    _options?: ITimerOptions,
  ): ITimerHandle {
    if (initialDelay === undefined || initialDelay < 0) {
      initialDelay = 0 as DurationMilliseconds;
    }

    let handle: TimerHandle<TDate | EpochMilliseconds, ReturnTypeOfSetTimeout> | undefined =
      undefined;

    const arm = (initialDelay: number): ReturnTypeOfSetTimeout => {
      const nativeHandle = setTimeout(() => {
        if (handle !== undefined && handle.isDisposed) {
          return false;
        }
        const next = callback();
        if (next !== false) {
          arm(next < 0 ? 0 : next);
        }
      }, initialDelay);
      if (handle !== undefined) {
        handle.setNativeHandle(nativeHandle);
      }
      return nativeHandle;
    };

    handle = new TimerHandle(TIMER_KIND_RECURRING, this, arm(initialDelay));

    return handle;
  }
}
