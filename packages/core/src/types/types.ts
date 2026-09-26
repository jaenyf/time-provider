/**
 * Type-only contracts.
 */

import type { IAddon } from "../builders/builders.ts";
import type {
  DefaultCalendarSchemeMonthName,
  DefaultCalendarSchemeWeekdayName,
} from "../calendar/default-calendar-scheme-names.ts";
import type { IDurationSpec } from "../helpers/branded-types.ts";

//#region General branded types
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/** Milliseconds as built by {@link toDuration}. */
export type DurationMilliseconds = Brand<number, "DurationMilliseconds">;

/** Epoch milliseconds as built by {@link toInstant}. */
export type EpochMilliseconds = Brand<number, "EpochMilliseconds">;

/** Milliseconds on a monotonic timeline. */
export type MonotonicMilliseconds = Brand<number, "MonotonicMilliseconds">;
//#endregion

//#region Disposable / IHasAbortSignal
export interface IDisposable {
  dispose(): void;
  [Symbol.dispose](): void;
  readonly isDisposed: boolean;
}

export interface IHasAbortSignal {
  readonly signal: AbortSignal;
}
//#endregion

//#region Timings
// ---------------------------------------------------------------------------
// Timings
// ---------------------------------------------------------------------------

interface IWithTimings {
  /** Get the current timings. */
  get timings(): ITimings;
}

/** The kind of a {@link ITimingEntry}. */
export type TimingKind = "mark" | "measure";

/** A mark or measure recorded by {@link ITimings}. */
export interface ITimingEntry {
  /** The entry name. */
  readonly name: string;

  /** The entry kind. */
  readonly entryType: TimingKind;

  /** The start time from {@link IMonotonicClock.monotonicOrigin}. */
  readonly startTime: MonotonicMilliseconds;

  /** The duration in milliseconds; `0` for marks. */
  readonly duration: DurationMilliseconds;

  /** The entry metadata, or `null`. */
  readonly detail: unknown;

  /** Returns the entry as a plain object. */
  toJSON(): unknown;
}

/** A named instant recorded via {@link ITimings.mark}. */
export interface ITimingMark extends ITimingEntry {
  readonly entryType: "mark";
}

/** A named timespan recorded via {@link ITimings.measure}. */
export interface ITimingMeasure extends ITimingEntry {
  readonly entryType: "measure";
}

/** Options for {@link ITimings.mark}. */
export interface ITimingMarkOptions {
  /** The instant; defaults to {@link IMonotonicClock.monotonicNow}. */
  startTime?: MonotonicMilliseconds;

  /** Mark metadata. */
  detail?: unknown;
}

/** Options for {@link ITimings.measure}. */
export interface ITimingMeasureOptions {
  /** Start mark/time; defaults to the monotonic origin. */
  start?: string | MonotonicMilliseconds;

  /** End mark/time; defaults to {@link IMonotonicClock.monotonicNow}. */
  end?: string | MonotonicMilliseconds;

  /** Overrides the calculated duration. */
  duration?: DurationMilliseconds;

  /** Measure metadata. */
  detail?: unknown;
}

/** Filters {@link ITimings.entries} and {@link ITimings.clear}. */
export interface ITimingsFilter {
  name?: string;

  /** Matches `entryType`. */
  kind?: TimingKind;
}

/** Records marks and measures on the monotonic clock. */
export interface ITimings {
  /** Records a named instant. */
  mark(name: string, options?: ITimingMarkOptions): ITimingMark;

  /**
   * Records a named timespan; without options, origin→now.
   * @throws If a mark is missing or the options are invalid.
   */
  measure(name: string, options?: ITimingMeasureOptions): ITimingMeasure;

  /** Returns matching entries in record order. */
  entries(filter?: ITimingsFilter): readonly ITimingEntry[];

  /** Removes matching entries. */
  clear(filter?: ITimingsFilter): void;
}

//#endregion

//#region Clock
// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

/** An IANA timezone name. */
export type TimezoneDefinition = string;

/** Time elements to advance. */
export interface IAdvanceOptions {
  /** Years to add or subtract. */
  years?: number;
  /** Months to add or subtract. */
  months?: number;
  /** Days to add or subtract. */
  days?: number;
  /** Hours to add or subtract. */
  hours?: number;
  /** Minutes to add or subtract. */
  minutes?: number;
  /** Seconds to add or subtract. */
  seconds?: number;
  /** Milliseconds to add or subtract. */
  milliseconds?: number;
}

/** A clock that can move forward or backward. */
interface IAdvanceable<TSelf> {
  /**
   * Moves the clock by the given amount.
   * @throws If the runtime is disposed.
   */
  advance(advanceOptions: IAdvanceOptions): TSelf;
}

interface IWithClock<TClock> {
  /** Get the current clock. */
  get clock(): TClock;
}

/** A clock exposing timestamps and ticks. */
interface ITimestampClock {
  /** Returns the current timestamp without side effects. */
  timestampNow(): EpochMilliseconds;
}

/** A clock exposing a monotonic read. */
interface IMonotonicClock {
  /** Returns milliseconds since {@link monotonicOrigin}. */
  monotonicNow(): MonotonicMilliseconds;

  /** The Unix timestamp corresponding to {@link monotonicNow} = `0`. */
  readonly monotonicOrigin: EpochMilliseconds;
}

/** A clock exposing UTC time only. */
interface IUtcOnlyClock<TDate> extends ITimestampClock, IMonotonicClock {
  /** Returns the current UTC time. */
  utcNow(): TDate;
}

interface ILocalOnlyClock<TDate> extends ITimestampClock, IMonotonicClock {
  /** Returns the current local time. */
  localNow(): TDate;

  /**
   * Redefines the local timezone.
   * @param timezone The new timezone.
   */
  withTimezone(timezone: TimezoneDefinition): this;

  /**
   * Returns the host timezone.
   * @returns The host timezone.
   */
  hostTimezone(): TimezoneDefinition;

  /**
   * Returns the current local timezone.
   * @returns The current timezone.
   */
  get timezone(): TimezoneDefinition;
}

/** A clock exposing UTC and local time. */
export interface IClock<TDate> extends IUtcOnlyClock<TDate>, ILocalOnlyClock<TDate> {}

/** A clock that can be moved forward or backward. */
export interface IManualClock<TDate> extends IClock<TDate>, IAdvanceable<IManualClock<TDate>> {}

interface IUtcOnlyManualClock<TDate>
  extends IUtcOnlyClock<TDate>, IAdvanceable<IUtcOnlyManualClock<TDate>> {}

//#endregion

//#region Calendar Scheme
// ---------------------------------------------------------------------------
// Calendar Scheme
// ---------------------------------------------------------------------------

/** The wall-clock calendar fields of a `TDate`. */
export interface CalendarSchemeFields {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly weekday: number;
}

/** The calendar fields accepted by {@link ICalendarScheme.compose}. */
export type ComposableCalendarSchemeFields = Omit<CalendarSchemeFields, "weekday">;

/** Adapts a plugin calendar to calendar-consuming code. */
export interface ICalendarScheme<
  TDate,
  TMonthName extends string = DefaultCalendarSchemeMonthName,
  TWeekdayName extends string = DefaultCalendarSchemeWeekdayName,
> {
  /** Converts `date` to epoch milliseconds. */
  toTimestamp(date: TDate): EpochMilliseconds;

  /** Converts epoch milliseconds to `TDate`. */
  fromTimestamp(timestampMs: EpochMilliseconds): TDate;

  /** Minutes per hour; `60` for Gregorian. */
  minutesPerHour(): number;

  /** Hours per day; `24` for Gregorian. */
  hoursPerDay(): number;

  /** Days per week; `7` for Gregorian. */
  daysPerWeek(): number;

  /** Months per year; `12` for Gregorian. */
  monthsPerYear(): number;

  /** Maximum day-of-month; `31` for Gregorian. */
  maxDayOfMonth(): number;

  /** Month names in calendar order. */
  readonly monthNames: readonly TMonthName[];

  /** Weekday names in calendar order. */
  readonly weekdayNames: readonly TWeekdayName[];

  /** Normalizes calendar fields. */
  normalize(fields: ComposableCalendarSchemeFields): CalendarSchemeFields;

  /** Decomposes `date` into calendar fields. */
  decompose(date: TDate, timezone: TimezoneDefinition): CalendarSchemeFields;

  /** Builds a `TDate` from calendar fields in `timezone`. */
  compose(fields: ComposableCalendarSchemeFields, timezone: TimezoneDefinition): TDate;
}

/** An {@link ICalendarScheme} using English month and weekday names. */
export interface IDefaultCalendarScheme<TDate> extends ICalendarScheme<
  TDate,
  DefaultCalendarSchemeMonthName,
  DefaultCalendarSchemeWeekdayName
> {}

//#endregion

//#region Converter
// ---------------------------------------------------------------------------
// Converter
// ---------------------------------------------------------------------------

interface IWithConverter<TConverter> {
  /** Get the current converter. */
  get converter(): TConverter;
}

/** A converter exposing UTC conversion only. */
export interface IUtcOnlyConverter<TDate> {
  /**
   * Converts `time` to UTC `TDate`.
   * @returns `time` as UTC.
   */
  convertToUtc(time: string | number | TDate): TDate;
}

/** A converter exposing local conversion only. */
interface ILocalOnlyConverter<TDate> {
  /**
   * Converts `time` to local `TDate`.
   * @returns `time` as local time.
   */
  convertToLocal(time: string | number | TDate): TDate;
}

/** Converts raw input to UTC or local `TDate`. */
export interface IConverter<TDate> extends IUtcOnlyConverter<TDate>, ILocalOnlyConverter<TDate> {}
//#endregion

//#region Timers
// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

/** Discriminates the source of an {@link IScheduledHandle}. */
export const SCHEDULED_TIMER_KIND_TIMEOUT = 0;
export const SCHEDULED_TIMER_KIND_INTERVAL = 1;
export const SCHEDULED_TIMER_KIND_RECURRING = 2;

/** Identifies the timer method used to obtain an {@link IScheduledHandle}. */
export enum ScheduledHandleKind {
  timeout = SCHEDULED_TIMER_KIND_TIMEOUT,
  interval = SCHEDULED_TIMER_KIND_INTERVAL,
  recurring = SCHEDULED_TIMER_KIND_RECURRING,
}

/** Handle returned by timer methods. */
export interface IScheduledHandle extends IDisposable, IHasAbortSignal {}

/** Timer creation options. */
export interface ITimerOptions {
  signal?: AbortSignal;
}

/** Schedules and cancels timers. */
export interface ITimers {
  /**
   * One-shot timer.
   * @throws If the runtime is disposed.
   */
  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle;

  /**
   * Promise variant of {@link ITimers.once}.
   * @throws If the runtime is disposed.
   */
  wait(delay: IDurationSpec, options?: ITimerOptions): Promise<void>;

  /**
   * Fixed-interval timer.
   * @throws If the runtime is disposed.
   */
  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle;

  /**
   * Dynamic recurrence; `false` stops it.
   * @throws If the runtime is disposed.
   */
  recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): IScheduledHandle;
}

interface IWithTimers {
  /** Get the current timers. */
  get timers(): ITimers;
}

interface IClearTimers {
  clearTimer(handle: IScheduledHandle): void;
}

//#endregion

//#region Microtasks
// ---------------------------------------------------------------------------
// Microtasks
// ---------------------------------------------------------------------------

/** Queues callbacks for the next microtask checkpoint. */
export interface IMicrotasks {
  /**
   * Queues `callback` for the next checkpoint.
   * @param callback The callback to run.
   * @throws If the runtime is disposed.
   */
  queue(callback: () => void): void;
}

/** Deterministic {@link IMicrotasks} with manual draining. */
export interface IDeterministicMicrotasks extends IMicrotasks {
  /** Runs queued callbacks until empty. */
  drain(): void;
}

interface IWithMicrotasks {
  /** Get the current microtasks. */
  get microtasks(): IMicrotasks;
}

interface IWithDeterministicMicrotasks {
  /** Get the current deterministic microtasks. */
  get microtasks(): IDeterministicMicrotasks;
}

//#endregion

//#region Scheduler
// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/** Schedules timers and microtasks. */
export interface IScheduler extends IWithTimers, IWithMicrotasks {}

/** Deterministic scheduler with manual microtask draining. */
export interface IDeterministicScheduler extends IWithTimers, IWithDeterministicMicrotasks {}

interface IWithScheduler {
  /** Get the current scheduler. */
  get scheduler(): IScheduler;
}

interface IWithDeterministicScheduler {
  /** Get the current deterministic scheduler. */
  get scheduler(): IDeterministicScheduler;
}
//#endregion

//#region Runtime
// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

/** Handles Runtime time conversions; used by plugins. */
export interface ITimeConverter<TDate> {
  /** Converts `time` to epoch milliseconds. */
  convertToTimestamp(time: string | EpochMilliseconds | number | TDate): EpochMilliseconds;

  /** Converts `time` to UTC `TDate`. */
  convertToUtcDate(time: string | EpochMilliseconds | TDate): TDate;

  /** Converts `time` to local `TDate`. */
  convertToLocalDate(timezone: TimezoneDefinition, time: string | EpochMilliseconds | TDate): TDate;

  /** This plugin's {@link ICalendarScheme}, when provided. */
  readonly calendarScheme?: ICalendarScheme<TDate>;
}

/** Provides the runtime's calendar scheme. */
export interface IWithCalendarScheme<TDate> {
  /** This runtime's calendar scheme; see {@link ICalendarScheme}. */
  get calendarScheme(): ICalendarScheme<TDate>;
}

/** A runtime backed by a timezone-aware clock. */
export interface IRuntime<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    ITimers,
    IClearTimers,
    IMicrotasks,
    IClock<TDate>,
    IConverter<TDate>,
    ITimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon<TDate>): void;

  /** @throws If this runtime is disposed. */
  assertIsNotDisposed(): void;
}

/** A deterministic runtime backed by a timezone-aware clock. */
export interface IDeterministicRuntime<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    ITimers,
    IClearTimers,
    IDeterministicMicrotasks,
    IClock<TDate>,
    IConverter<TDate>,
    IDeterministicTimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon<TDate>): void;

  /** @throws If this runtime is disposed. */
  assertIsNotDisposed(): void;

  specific(
    tag: unknown,
    kind: ScheduledHandleKind,
    initialDelay: IDurationSpec,
    callback: () => void,
    intervalDelay?: number,
  ): IScheduledHandle;

  takeOutSpecificCallbacks(tag: unknown, maxCount: number): (() => void)[];
}

/** A runtime backed by a UTC-only clock. */
export interface IUtcOnlyRuntime<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    ITimers,
    IClearTimers,
    IMicrotasks,
    IUtcOnlyClock<TDate>,
    IUtcOnlyConverter<TDate>,
    IUtcOnlyTimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon<TDate>): void;

  /** @throws If this runtime is disposed. */
  assertIsNotDisposed(): void;
}

/** A deterministic runtime backed by a UTC-only clock. */
export interface IUtcOnlyDeterministicRuntime<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    ITimers,
    IClearTimers,
    IDeterministicMicrotasks,
    IUtcOnlyClock<TDate>,
    IUtcOnlyConverter<TDate>,
    IUtcOnlyDeterministicTimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon<TDate>): void;

  /** @throws If this runtime is disposed. */
  assertIsNotDisposed(): void;
}

/** A runtime backed by a manual clock. */
export interface IManualRuntime<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    IManualClock<TDate>,
    IWithClock<IManualClock<TDate>>,
    ITimers,
    IClearTimers,
    IDeterministicMicrotasks,
    IClock<TDate>,
    IConverter<TDate>,
    IManualTimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon<TDate>): void;

  /** @throws If this runtime is disposed. */
  assertIsNotDisposed(): void;

  specific(
    tag: unknown,
    kind: ScheduledHandleKind,
    initialDelay: IDurationSpec,
    callback: () => void,
    intervalDelay?: number,
  ): IScheduledHandle;

  takeOutSpecificCallbacks(tag: unknown, maxCount: number): (() => void)[];
}

/** A runtime backed by a UTC-only manual clock. */
export interface IUtcOnlyManualRuntime<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    IUtcOnlyManualClock<TDate>,
    IWithClock<IUtcOnlyManualClock<TDate>>,
    ITimers,
    IClearTimers,
    IDeterministicMicrotasks,
    IUtcOnlyClock<TDate>,
    IUtcOnlyConverter<TDate>,
    IUtcOnlyManualTimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon<TDate>): void;

  /** @throws If this runtime is disposed. */
  assertIsNotDisposed(): void;
}
//#endregion

//#region Time provider facades
// ---------------------------------------------------------------------------
// Time provider facades
// ---------------------------------------------------------------------------

/** Public facade of a timezone-aware Time-Provider. */
export interface ITimeProvider<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    IWithClock<IClock<TDate>>,
    IWithScheduler,
    IWithConverter<IConverter<TDate>>,
    IWithTimings {}

/** Public facade of a deterministic timezone-aware Time-Provider. */
export interface IDeterministicTimeProvider<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    IWithClock<IClock<TDate>>,
    IWithDeterministicScheduler,
    IWithConverter<IConverter<TDate>>,
    IWithTimings {}

/** Public facade of a UTC-only Time-Provider. */
export interface IUtcOnlyTimeProvider<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    IWithClock<IUtcOnlyClock<TDate>>,
    IWithScheduler,
    IWithConverter<IUtcOnlyConverter<TDate>>,
    IWithTimings {}

/** Public facade of a deterministic UTC-only Time-Provider. */
export interface IUtcOnlyDeterministicTimeProvider<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    IWithClock<IUtcOnlyClock<TDate>>,
    IWithDeterministicScheduler,
    IWithConverter<IUtcOnlyConverter<TDate>>,
    IWithTimings {}

/** Public facade of a manual timezone-aware Time-Provider. */
export interface IManualTimeProvider<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    IWithClock<IManualClock<TDate>>,
    IWithDeterministicScheduler,
    IWithConverter<IConverter<TDate>>,
    IWithTimings {}

/** Public facade of a manual UTC-only Time-Provider. */
export interface IUtcOnlyManualTimeProvider<TDate>
  extends
    IDisposable,
    IHasAbortSignal,
    IWithClock<IUtcOnlyManualClock<TDate>>,
    IWithDeterministicScheduler,
    IWithConverter<IUtcOnlyConverter<TDate>>,
    IWithTimings {}
//#endregion

//#region Plugins
// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

/** A plugin producing system runtimes with a timezone-aware date library. */
export interface ISystemPlugin<TDate> {
  /** Whether the plugin supports timezones and local time. */
  readonly supportsLocalTime: true;

  /** Creates a system-time runtime. */
  createSystemRuntime(localTimezone: TimezoneDefinition): IRuntime<TDate>;
}

/** A plugin producing UTC-only system runtimes. */
export interface IUtcOnlySystemPlugin<TDate> {
  /** Whether the plugin supports timezones and local time. */
  readonly supportsLocalTime: false;

  /** Creates a UTC-only system-time runtime. */
  createSystemRuntime(): IUtcOnlyRuntime<TDate>;
}

/** A plugin producing deterministic timezone-aware runtimes. */
export interface IDeterministicPlugin<TDate> {
  /** Whether the plugin supports timezones and local time. */
  readonly supportsLocalTime: true;

  /** Creates a manual-time runtime. */
  createManualRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IManualRuntime<TDate>;

  /** Creates a fixed-time runtime. */
  createFixedRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IDeterministicRuntime<TDate>;

  /**
   * Creates a sequential-time runtime.
   * @param sequentialTimes Empty means the clock stays at the Unix epoch.
   */
  createSequentialRuntime(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ): IDeterministicRuntime<TDate>;
}

/** A plugin producing deterministic UTC-only runtimes. */
export interface IUtcOnlyDeterministicPlugin<TDate> {
  /** Whether the plugin supports timezones and local time. */
  readonly supportsLocalTime: false;

  /** Creates a manual-time runtime. */
  createManualRuntime(
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IUtcOnlyManualRuntime<TDate>;

  /** Creates a fixed-time runtime. */
  createFixedRuntime(
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IUtcOnlyDeterministicRuntime<TDate>;

  /**
   * Creates a sequential-time runtime.
   * @param sequentialTimes Empty means the clock stays at the Unix epoch.
   */
  createSequentialRuntime(
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ): IUtcOnlyDeterministicRuntime<TDate>;
}
//#endregion
