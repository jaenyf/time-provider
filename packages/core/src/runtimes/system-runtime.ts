import { toDuration, type IDurationSpec } from "../helpers/branded-types.ts";
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
    this.untrackHandle(handle);
  }

  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions) {
    let msDelay = toDuration(delay);
    if (msDelay < 0) {
      msDelay = 0 as DurationMilliseconds;
    }
    return this.trackHandle(
      new TimerHandle(TIMER_KIND_TIMEOUT, this, setTimeout(callback, msDelay)),
      options,
    );
  }

  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): ITimerHandle {
    let msDelay = toDuration(delay);
    if (msDelay < 1) {
      msDelay = 1 as DurationMilliseconds;
    }
    return this.trackHandle(
      new TimerHandle(TIMER_KIND_INTERVAL, this, setInterval(callback, msDelay)),
      options,
    );
  }

  recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): ITimerHandle {
    let msInitialDelay = initialDelay !== undefined ? toDuration(initialDelay) : 0;

    let handle: TimerHandle<TDate | EpochMilliseconds, ReturnTypeOfSetTimeout> | undefined =
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

    handle = new TimerHandle(TIMER_KIND_RECURRING, this, arm(msInitialDelay));
    return this.trackHandle(handle, options);
  }
}
