import { toDuration, type IDurationSpec } from "../helpers/branded-types.ts";
import { SystemPerformance } from "../performance/system-performance.ts";
import type {
  DurationMilliseconds,
  EpochMilliseconds,
  ITimeConverter,
  IScheduledHandle,
  ITimerOptions,
  TimezoneDefinition,
} from "../types/types.ts";
import {
  SCHEDULED_TIMER_KIND_INTERVAL,
  SCHEDULED_TIMER_KIND_RECURRING,
  SCHEDULED_TIMER_KIND_TIMEOUT,
} from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";
import { ScheduledHandle } from "./scheduled-handle.ts";

type ReturnTypeOfSetInterval = ReturnType<typeof setInterval>;
type ReturnTypeOfSetTimeout = ReturnType<typeof setTimeout>;
// oxlint-disable-next-line typescript/no-duplicate-type-constituents
type ReturnTypeOfTimer = ReturnTypeOfSetInterval;

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

  clearTimer(handle: IScheduledHandle): void {
    // Only this class's own once()/every()/recurring() ever construct a handle for this runtime,
    // and they always wrap a real system timer id - safe to assume that shape here.
    const scheduledHandle = handle as ScheduledHandle<TDate, ReturnTypeOfTimer>;
    switch (scheduledHandle.kind) {
      case SCHEDULED_TIMER_KIND_INTERVAL:
        clearInterval(scheduledHandle.nativeHandle);
        break;
      case SCHEDULED_TIMER_KIND_TIMEOUT:
      case SCHEDULED_TIMER_KIND_RECURRING:
        clearTimeout(scheduledHandle.nativeHandle);
        break;
      default:
        throw new Error("Invalid operation");
    }
    this.untrackHandle(handle);
  }

  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions) {
    let msDelay = toDuration(delay);
    if (msDelay < 0) {
      msDelay = 0 as DurationMilliseconds;
    }
    return this.trackHandle(
      new ScheduledHandle(SCHEDULED_TIMER_KIND_TIMEOUT, this, setTimeout(callback, msDelay)),
      options,
    );
  }

  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    let msDelay = toDuration(delay);
    if (msDelay < 1) {
      msDelay = 1 as DurationMilliseconds;
    }
    return this.trackHandle(
      new ScheduledHandle(SCHEDULED_TIMER_KIND_INTERVAL, this, setInterval(callback, msDelay)),
      options,
    );
  }

  recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): IScheduledHandle {
    let msInitialDelay = initialDelay !== undefined ? toDuration(initialDelay) : 0;

    let handle: ScheduledHandle<TDate | EpochMilliseconds, ReturnTypeOfSetTimeout> | undefined =
      undefined;

    const arm = (msInitialDelay: number): ReturnTypeOfSetTimeout => {
      const nativeHandle = setTimeout(() => {
        if (handle !== undefined && handle.isDisposed) {
          return false;
        }
        const next = callback();
        if (next !== false) {
          arm(toDuration(next));
        }
      }, msInitialDelay);
      if (handle !== undefined) {
        handle.setNativeHandle(nativeHandle);
      }
      return nativeHandle;
    };

    handle = new ScheduledHandle(SCHEDULED_TIMER_KIND_RECURRING, this, arm(msInitialDelay));
    return this.trackHandle(handle, options);
  }
}
