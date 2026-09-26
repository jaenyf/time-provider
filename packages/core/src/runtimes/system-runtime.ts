import { toDuration, type IDurationSpec } from "../helpers/branded-types.ts";
import { SystemTimings } from "../timings/system-timings.ts";
import type {
  DurationMilliseconds,
  EpochMilliseconds,
  ITimeConverter,
  ITimings,
  IScheduledHandle,
  ITimerOptions,
  MonotonicMilliseconds,
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

/** Maximum native timer delay. */
const MAX_NATIVE_DELAY = 2_147_483_647;

/** Arms `callback` for `msDelay`, chunking delays above {@link MAX_NATIVE_DELAY}. */
function armTimeout(
  msDelay: number,
  callback: () => void,
  onRearm: (nativeHandle: ReturnTypeOfSetTimeout) => void,
): ReturnTypeOfSetTimeout {
  if (msDelay <= MAX_NATIVE_DELAY) {
    return setTimeout(callback, msDelay);
  }
  return setTimeout(() => {
    onRearm(armTimeout(msDelay - MAX_NATIVE_DELAY, callback, onRearm));
  }, MAX_NATIVE_DELAY);
}

/** Base class for system runtimes. */
export abstract class BaseSystemRuntime<TDate> extends BaseRuntime<TDate> {
  #timings = new SystemTimings();

  /**
   * @param localTimezone The runtime timezone.
   * @param converter The runtime time converter.
   */
  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    super(localTimezone, converter);
  }

  get timings(): ITimings {
    return this.#timings;
  }

  monotonicNow(): MonotonicMilliseconds {
    return performance.now() as MonotonicMilliseconds;
  }

  get monotonicOrigin(): EpochMilliseconds {
    return performance.timeOrigin as EpochMilliseconds;
  }

  clearTimer(handle: IScheduledHandle): void {
    // Only this class's once()/every()/recurring() ever construct a handle for a system runtime,
    // and they always hand back a ScheduledHandle wrapping a native setTimeout/setInterval id -
    // safe to assume that shape here.
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
    this.untrackHandle(scheduledHandle);
  }

  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    this.assertIsNotDisposed();
    let msDelay = toDuration(delay);
    if (msDelay < 0) {
      msDelay = 0 as DurationMilliseconds;
    }
    let handle: ScheduledHandle<TDate | EpochMilliseconds, ReturnTypeOfSetTimeout> | undefined =
      undefined;
    const nativeHandle = armTimeout(
      msDelay,
      () => {
        try {
          callback();
        } finally {
          // A one-shot timer has nothing left to dispose once its callback has run.
          handle?.dispose();
        }
      },
      (rearmed) => handle?.setNativeHandle(rearmed),
    );
    handle = new ScheduledHandle(SCHEDULED_TIMER_KIND_TIMEOUT, this, nativeHandle);
    return this.trackHandle(handle, options);
  }

  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    this.assertIsNotDisposed();
    let msDelay = toDuration(delay);
    if (msDelay < 1) {
      msDelay = 1 as DurationMilliseconds;
    }
    if (msDelay <= MAX_NATIVE_DELAY) {
      return this.trackHandle(
        new ScheduledHandle(SCHEDULED_TIMER_KIND_INTERVAL, this, setInterval(callback, msDelay)),
        options,
      );
    }
    // Past the native limit there is no interval to arm: the period is re-armed one run at a time.
    // Re-arming before the run keeps a callback that disposes its own handle from leaving the next
    // period pending, and leaves a callback that throws still recurring, as setInterval does.
    let handle: ScheduledHandle<TDate | EpochMilliseconds, ReturnTypeOfSetTimeout> | undefined =
      undefined;
    const rearm = (nativeHandle: ReturnTypeOfSetTimeout): void => {
      handle?.setNativeHandle(nativeHandle);
    };
    const arm = (): ReturnTypeOfSetTimeout =>
      armTimeout(
        msDelay,
        () => {
          rearm(arm());
          callback();
        },
        rearm,
      );
    handle = new ScheduledHandle(SCHEDULED_TIMER_KIND_INTERVAL, this, arm());
    return this.trackHandle(handle, options);
  }

  recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): IScheduledHandle {
    this.assertIsNotDisposed();
    let msInitialDelay = initialDelay !== undefined ? toDuration(initialDelay) : 0;

    let handle: ScheduledHandle<TDate | EpochMilliseconds, ReturnTypeOfSetTimeout> | undefined =
      undefined;

    const rearm = (nativeHandle: ReturnTypeOfSetTimeout): void => {
      handle?.setNativeHandle(nativeHandle);
    };

    const arm = (msInitialDelay: number): ReturnTypeOfSetTimeout => {
      const nativeHandle = armTimeout(
        msInitialDelay,
        () => {
          if (handle !== undefined && handle.isDisposed) {
            return false;
          }
          let next: IDurationSpec | false;
          try {
            next = callback();
          } catch (error) {
            // Nothing left to dispose once the schedule has stopped, including by throwing.
            handle?.dispose();
            throw error;
          }
          if (next !== false) {
            arm(toDuration(next));
          } else {
            handle?.dispose();
          }
        },
        rearm,
      );
      rearm(nativeHandle);
      return nativeHandle;
    };

    handle = new ScheduledHandle(SCHEDULED_TIMER_KIND_RECURRING, this, arm(msInitialDelay));
    return this.trackHandle(handle, options);
  }

  /** Queues `callback` on the host microtask queue. */
  queue(callback: () => void): void {
    this.assertIsNotDisposed();
    queueMicrotask(callback);
  }
}
