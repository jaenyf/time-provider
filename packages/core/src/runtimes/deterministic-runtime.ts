import type {
  IAdvanceOptions,
  IManualClock,
  IManualRuntime,
  ITimeConverter,
  SetIntervalHandle,
  SetTimeoutHandle,
  TimezoneDefinition,
} from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

type TimeoutEntry = {
  runAt: number;
  callback: () => void;
};

type IntervalEntry = {
  runAt: number;
  delay: number;
  callback: () => void;
};

/**
 * Base class for all deterministic runtime classes.
 */
abstract class BaseDeterministicRuntime<TDate> extends BaseRuntime<TDate> {
  #timeoutCallbacksMap: Map<SetTimeoutHandle, TimeoutEntry>;
  #nextTimeoutHandleValue: number;
  #intervalCallbacksMap: Map<SetIntervalHandle, IntervalEntry>;
  #nextIntervalHandleValue: number;

  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    super(localTimezone, converter);
    this.#nextTimeoutHandleValue = 1;
    this.#timeoutCallbacksMap = new Map<SetTimeoutHandle, TimeoutEntry>();
    this.#nextIntervalHandleValue = 1;
    this.#intervalCallbacksMap = new Map<SetIntervalHandle, IntervalEntry>();
  }

  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle {
    millisecondsDelay = Math.max(0, millisecondsDelay !== undefined ? millisecondsDelay : 0);

    const now = this.timestamp();
    const runAt = now + millisecondsDelay;
    const handle = this.#nextTimeoutHandleValue as unknown as SetTimeoutHandle;
    this.#timeoutCallbacksMap.set(handle, { runAt, callback });
    this.#nextTimeoutHandleValue += 1;
    // `now` can't have moved since any earlier call, so nothing already in the map can have newly become due
    this.mayRunTimeoutCallbacks(now, handle);
    return handle;
  }
  clearTimeout(handle: SetTimeoutHandle) {
    this.#timeoutCallbacksMap.delete(handle);
  }
  protected mayRunTimeoutCallbacks(nowTimestamp: number, onlyHandle?: SetTimeoutHandle): void {
    const handlesToClear: SetTimeoutHandle[] = [];
    const callbacksToRun: (() => void)[] = [];

    if (onlyHandle !== undefined) {
      const entry = this.#timeoutCallbacksMap.get(onlyHandle);
      if (entry !== undefined && entry.runAt <= nowTimestamp) {
        handlesToClear.push(onlyHandle);
        callbacksToRun.push(entry.callback);
      }
    } else {
      for (const [handle, entry] of this.#timeoutCallbacksMap) {
        if (entry.runAt <= nowTimestamp) {
          handlesToClear.push(handle);
          callbacksToRun.push(entry.callback);
        }
      }
    }

    for (const handle of handlesToClear) {
      this.clearTimeout(handle);
    }
    for (const callback of callbacksToRun) {
      callback();
    }
  }

  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle {
    millisecondsDelay = Math.max(0, millisecondsDelay !== undefined ? millisecondsDelay : 0);
    const now = this.timestamp();
    const runAt = now + millisecondsDelay;
    const handle = this.#nextIntervalHandleValue as unknown as SetIntervalHandle;
    this.#intervalCallbacksMap.set(handle, {
      runAt: runAt,
      delay: millisecondsDelay,
      callback: callback,
    });
    this.#nextIntervalHandleValue += 1;
    // `now` can't have moved since any earlier call, so nothing already in the map can have newly become due
    this.mayRunIntervalCallbacks(now, handle);
    return handle;
  }
  clearInterval(handle: SetIntervalHandle) {
    this.#intervalCallbacksMap.delete(handle);
  }
  protected mayRunIntervalCallbacks(nowTimestamp: number, onlyHandle?: SetIntervalHandle): void {
    if (onlyHandle !== undefined) {
      /*
       * `onlyHandle` is only ever passed here by setInterval(), synchronously right after that same handle was inserted.
       * Nothing can have removed it yet, so we can safely assume it's always present.
       */
      const entry = this.#intervalCallbacksMap.get(onlyHandle)!;
      this.#fireDueIntervalEntry(entry, nowTimestamp);

      return;
    }
    for (const entry of this.#intervalCallbacksMap.values()) {
      this.#fireDueIntervalEntry(entry, nowTimestamp);
    }
  }

  #fireDueIntervalEntry(entry: IntervalEntry, nowTimestamp: number): void {
    while (entry.runAt <= nowTimestamp) {
      entry.callback();
      /*
        Real environments (node, browsers) clamp an interval delay below 1ms
        up to 1ms - a 0ms interval still fires roughly once per millisecond,
        not "as fast as infinitely possible". Falling back to 1 here mirrors
        that: a live interval genuinely re-fires proportionally to elapsed
        time when advance()-d far into the future, matching what it would
        do in a real environment.
      */
      entry.runAt += entry.delay ? entry.delay : 1;
    }
  }

  protected timestamp(): number {
    return this.timestampImpl();
  }

  protected abstract timestampImpl(): number;

  override localNow(): TDate {
    return this.localNowImpl(this.timestampImpl());
  }
  override utcNow(): TDate {
    return this.utcNowImpl(this.timestampImpl());
  }
  protected abstract localNowImpl(nowTimestamp: number): TDate;
  protected abstract utcNowImpl(nowTimestamp: number): TDate;
}

/**
 * Base class for a deterministically sequential runtime
 */
export abstract class BaseSequentialRuntime<TDate> extends BaseDeterministicRuntime<TDate> {
  protected _sequentialTimestamps: number[];
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | TDate)[],
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, converter);
    this._sequentialTimestamps = sequentialTimes.map((t) => this.convertToEpochTimestampImpl(t));
  }

  timestampImpl() {
    return this.peekTimestamp();
  }
  localNowImpl() {
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunTimeoutCallbacks(nowTimestamp);
    this.mayRunIntervalCallbacks(nowTimestamp);
    return this.convertToLocalDateImpl(this.localTimezone, nowTimestamp);
  }
  utcNowImpl() {
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunTimeoutCallbacks(nowTimestamp);
    this.mayRunIntervalCallbacks(nowTimestamp);
    return this.convertToUtcDateImpl(nowTimestamp);
  }

  private peekTimestamp(): number {
    return this._sequentialTimestamps.length > 0 ? this._sequentialTimestamps[0] : 0;
  }

  private getNextSequentialTimestamp(): number {
    return this._sequentialTimestamps.length > 1
      ? (this._sequentialTimestamps.shift() as number)
      : this._sequentialTimestamps.length > 0
        ? this._sequentialTimestamps[0]
        : 0;
  }
}

/**
 * Base class for a deterministically fixed runtime
 */
export abstract class BaseFixedRuntime<TDate> extends BaseSequentialRuntime<TDate> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
  }
  /* time is frozen */
  protected override mayRunTimeoutCallbacks(_nowTimestamp: number): void {}
  /* time is frozen */
  protected override mayRunIntervalCallbacks(_nowTimestamp: number): void {}
}

/**
 * Base class for a deterministically manual runtime
 */
export abstract class BaseManualRuntime<TDate>
  extends BaseSequentialRuntime<TDate>
  implements IManualRuntime<TDate>
{
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
  }

  protected setDeterminedTime(time: TDate) {
    this._sequentialTimestamps[0] = this.convertToEpochTimestampImpl(time);
  }

  get clock(): IManualClock<TDate> {
    return this;
  }

  advance(advanceConfiguration: IAdvanceOptions): IManualRuntime<TDate> {
    let time = this.utcNow();

    if (advanceConfiguration.years) {
      time = this.advanceYears(time, advanceConfiguration.years);
    }
    if (advanceConfiguration.months) {
      time = this.advanceMonths(time, advanceConfiguration.months);
    }
    if (advanceConfiguration.days) {
      time = this.advanceDays(time, advanceConfiguration.days);
    }
    if (advanceConfiguration.hours) {
      time = this.advanceHours(time, advanceConfiguration.hours);
    }
    if (advanceConfiguration.minutes) {
      time = this.advanceMinutes(time, advanceConfiguration.minutes);
    }
    if (advanceConfiguration.seconds) {
      time = this.advanceSeconds(time, advanceConfiguration.seconds);
    }
    if (advanceConfiguration.milliseconds) {
      time = this.advanceMilliseconds(time, advanceConfiguration.milliseconds);
    }

    this.setDeterminedTime(time);
    this.mayRunTimeoutCallbacks(this.timestamp());
    this.mayRunIntervalCallbacks(this.timestamp());
    return this;
  }

  protected abstract advanceYears(time: TDate, years: number): TDate;
  protected abstract advanceMonths(time: TDate, months: number): TDate;
  protected abstract advanceDays(time: TDate, days: number): TDate;
  protected abstract advanceHours(time: TDate, hours: number): TDate;
  protected abstract advanceMinutes(time: TDate, minutes: number): TDate;
  protected abstract advanceSeconds(time: TDate, seconds: number): TDate;
  protected abstract advanceMilliseconds(time: TDate, milliseconds: number): TDate;
}
