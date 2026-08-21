/**
 * All pure, type-only contracts of the library are here.
 * None of them cause JavaScript to be emited, so it has no effect on bundle size or tree-shaking.
 */

import type { IAddon } from "../builders/builders.ts";
import type {
  DefaultCalendarSchemeMonthName,
  DefaultCalendarSchemeWeekdayName,
} from "../calendar/default-calendar-scheme-names.ts";
import type { IDurationSpec } from "../helpers/branded-types.ts";
import type { TimerHandle } from "../runtimes/timer-handle.ts";

//#region General branded types
type Brand<T, B extends string> = T & { readonly __brand: B };
export type DurationMilliseconds = Brand<number, "DurationMilliseconds">;
export type EpochMilliseconds = Brand<number, "EpochMilliseconds">;
//#endregion

//#region Disposable / Abortable
export interface IDisposable {
  dispose(): void;
  [Symbol.dispose](): void;
  readonly isDisposed: boolean;
}

export interface IAbortable {
  readonly signal: AbortSignal;
}
//#endregion

//#region Performance
// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

interface IWithPerformance {
  /**
   * Get the current configured performance API.
   */
  get performance(): IPerformance;
}

/**
 * The kind of a {@link IPerformanceEntry}.
 */
export type PerformanceEntryType =
  | "dns" // Node.js only
  | "function" // Node.js only
  | "gc" // Node.js only
  | "http2" // Node.js only
  | "http" // Node.js only
  | "mark" // available on the Web
  | "measure" // available on the Web
  | "net" // Node.js only
  | "node" // Node.js only
  | "resource"; // available on the Web

/**
 * A single entry recorded on a {@link IPerformance} timeline, such as a mark or a measure.
 */
export interface IPerformanceEntry {
  /**
   * The name given to the entry when it was created.
   */
  readonly name: string;
  /**
   * The kind of entry this is.
   */
  readonly entryType: PerformanceEntryType;
  /**
   * The timestamp, relative to {@link IPerformance.timeOrigin}, at which the entry starts.
   */
  readonly startTime: EpochMilliseconds;
  /**
   * The duration of the entry, in milliseconds. Always `0` for a mark.
   */
  readonly duration: DurationMilliseconds;
}

/**
 * A single instant recorded via {@link IPerformance.mark}.
 */
export interface IPerformanceMark extends IPerformanceEntry {
  readonly entryType: "mark";
}

/**
 * A duration recorded via {@link IPerformance.measure}.
 */
export interface IPerformanceMeasure extends IPerformanceEntry {
  readonly entryType: "measure";
}

export interface IPerformanceMarkOptions {
  /**
   * Optional start time for the mark.
   *
   * If omitted, the current performance timestamp is used.
   */
  startTime?: EpochMilliseconds;

  /**
   * Arbitrary metadata associated with the mark.
   */
  detail?: unknown;
}

export interface IPerformanceMeasureOptions {
  /**
   * The start point of the measurement.
   *
   * Can be:
   * - a mark name
   * - an explicit performance timestamp
   */
  start?: string | EpochMilliseconds;

  /**
   * The end point of the measurement.
   *
   * Can be:
   * - a mark name
   * - an explicit performance timestamp
   */
  end?: string | EpochMilliseconds;

  /**
   * Duration to use instead of calculating from start/end.
   */
  duration?: DurationMilliseconds;

  /**
   * Arbitrary metadata associated with the measure.
   */
  detail?: unknown;
}

/**
 * The performance API
 */
export interface IPerformance {
  /**
   * Returns the current high-resolution timestamp in milliseconds
   * relative to timeOrigin.
   */
  now(): DurationMilliseconds;

  /**
   * The Unix timestamp at which this performance timeline started.
   */
  readonly timeOrigin: EpochMilliseconds;

  /**
   * Returns all performance entries.
   */
  getEntries(): readonly IPerformanceEntry[];

  /**
   * Returns performance entries with a specific name.
   */
  getEntriesByName(name: string, entryType?: PerformanceEntryType): readonly IPerformanceEntry[];

  /**
   * Returns performance entries of a specific type.
   */
  getEntriesByType(entryType: PerformanceEntryType): readonly IPerformanceEntry[];

  /**
   * Creates a timestamp marker.
   */
  mark(name: string, options?: IPerformanceMarkOptions): IPerformanceMark;

  /**
   * Creates a measured duration between marks or timestamps.
   */
  measure(
    name: string,
    startMarkOrOptions?: string | IPerformanceMeasureOptions,
  ): IPerformanceMeasure;

  /**
   * Removes marks.
   */
  clearMarks(name?: string): void;

  /**
   * Removes measures.
   */
  clearMeasures(name?: string): void;
}

//#endregion

//#region Clock
// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

/**
 * An IANA timezone name (e.g. `"Etc/UTC"`, `"Europe/Paris"`) identifying a local timezone.
 */
export type TimezoneDefinition = string;

/**
 * Describe the time elements of a manual clock to advance.
 *
 * Note: When more than one element is set, they are applied to the current time in a
 * fixed order :  years, months,days, hours, minutes, seconds, milliseconds.
 * This order is important because, for calendar-variable elements (`months`, `years`), combining them with other
 * elements can give a different result than a different application order would.
 */
export interface IAdvanceOptions {
  /** Number of years to add (or subtract, if negative). */
  years?: number;
  /** Number of months to add (or subtract, if negative). */
  months?: number;
  /** Number of days to add (or subtract, if negative). */
  days?: number;
  /** Number of hours to add (or subtract, if negative). */
  hours?: number;
  /** Number of minutes to add (or subtract, if negative). */
  minutes?: number;
  /** Number of seconds to add (or subtract, if negative). */
  seconds?: number;
  /** Number of milliseconds to add (or subtract, if negative). */
  milliseconds?: number;
}

/**
 * A clock capable of moving its own time forward or backward.
 */
interface IAdvanceable<TSelf> {
  /**
   * Moves this clock's time forward (or backward, using negative values) by
   * the given amount.
   *
   * If a scheduler backed by this clock has pending `setTimeout`/
   * `setInterval` callbacks, any of them that become due as a result are run
   * synchronously, in-line, before `advance()` returns - see
   * {@link ITimers} for details on this execution model.
   */
  advance(advanceOptions: IAdvanceOptions): TSelf;
}

interface IWithClock<TClock> {
  /**
   * Get the current configured clock
   */
  get clock(): TClock;
}

/**
 * A clock that exposes timestamps/ticks.
 */
interface ITimestampClock {
  /**
   * Returns the current time stamp.
   * Note: This operation is guaranteed to be side effects free.
   * On sequential clock, it does not consume the next queued value, and never runs due scheduler callbacks.
   * {@link IUtcOnlyClock.utcNow}/{@link ILocalOnlyClock.localNow} are the reads that do.
   * Use this instead when "now" is only needed to compute something (e.g. a delay), not to observe the passage of time.
   */
  timestampNow(): EpochMilliseconds;
}

/**
 * A clock that only exposes UTC time.
 */
interface IUtcOnlyClock<TDate> extends ITimestampClock {
  /**
   * Returns the time as of now in UTC.
   * Note: On a sequential clock, this read also makes time advance and may run due scheduler callbacks.
   * See {@link ITimestampClock.timestampNow} for a side-effect-free read.
   */
  utcNow(): TDate;
}

interface ILocalOnlyClock<TDate> extends ITimestampClock {
  /**
   * Returns the time as of now for the local timezone of the runtime.
   * If no local timezone has been specified when building it, is assumed to be "Etc/UTC" (aka. Greenwhich timezone).
   * Note: On a sequential clock, this read also makes time advance and may run due scheduler callbacks.
   * See {@link ITimestampClock.timestampNow} for a side-effect-free read.
   */
  localNow(): TDate;
  /**
   * Redefine the local timezone of the runtime.
   *
   * @param timezone the new local `timezone` to be used by the runtime.
   */
  withTimezone(timezone: TimezoneDefinition): this;
  /**
   * Retrieves the host timezone.
   * @returns a `TimezoneDefinition` describing the host timezone.
   */
  hostTimezone(): TimezoneDefinition;

  /**
   * Get the current defined local timezone.
   * @returns the current defined local timezone as a `TimezoneDefinition`.
   */
  get timezone(): TimezoneDefinition;
}

/**
 * A clock exposing both UTC and local time, backed by a configurable local timezone.
 */
export interface IClock<TDate> extends IUtcOnlyClock<TDate>, ILocalOnlyClock<TDate> {}

/**
 * A clock whose time can be moved forward or backward on demand. See {@link IAdvanceable.advance}.
 */
export interface IManualClock<TDate> extends IClock<TDate>, IAdvanceable<IManualClock<TDate>> {}

interface IUtcOnlyManualClock<TDate>
  extends IUtcOnlyClock<TDate>, IAdvanceable<IUtcOnlyManualClock<TDate>> {}

//#endregion

//#region Calendar Scheme
// ---------------------------------------------------------------------------
// Calendar Scheme
// ---------------------------------------------------------------------------

/**
 * The wall-clock calendar fields a `TDate` decomposes into, in whatever calendar system that
 * `TDate`'s {@link ICalendarScheme} represents - not necessarily Gregorian. `weekday` is derived
 * (0-based, calendar-defined), not an independent field - see {@link ComposableCalendarSchemeFields}
 * for the subset {@link ICalendarScheme.compose} actually accepts.
 */
export interface CalendarSchemeFields {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly weekday: number;
}

/**
 * The fields {@link ICalendarScheme.compose} accepts - every {@link CalendarSchemeFields} member
 * except the derived `weekday`.
 */
export type ComposableCalendarSchemeFields = Omit<CalendarSchemeFields, "weekday">;

/**
 * This interface acts as an adapter between any plugin calendar and any calendar-related code consummers.
 * It provides calendar-related introspection/arithmetic for a `TDate`, delegated to whichever date library backs it -
 * lets calendar-consuming code (e.g. the cron addon) work against any plugin's own calendar
 * system and timezone data instead of assuming Gregorian/`Intl`. Optional on
 * {@link ITimeConverter}: a plugin only implements it to diverge from the shared default (e.g. to
 * honor its own bundled timezone data) or to support an operation the default can't. When a
 * plugin doesn't provide one, {@link IUtcOnlyClock.calendar} falls back to that default.
 *
 * Nothing here assumes a specific calendar system: the unit sizes are all queried rather than
 * assumed (a calendar with 36 months of 10 days, or a day of 10 hours, is describable), and the
 * month/weekday names are whatever this calendar calls them - `TMonthName`/`TWeekdayName` default
 * to the Gregorian ones so the overwhelmingly common case needs no type arguments at all.
 *
 * Every member is cheap to implement even for a plugin with nothing to diverge on: the
 * constant-shaped ones are one-liners, and the rest are thin forwards to an accessor/method the
 * date library already exposes natively (`.year()`, `.add()`/`.plus()`, ...) - none of it is
 * calendar math reimplemented per plugin, just a uniform shape generic code can call across
 * incompatible APIs.
 */
export interface ICalendarScheme<
  TDate,
  TMonthName extends string = DefaultCalendarSchemeMonthName,
  TWeekdayName extends string = DefaultCalendarSchemeWeekdayName,
> {
  /** Converts `date` to epoch milliseconds - same as {@link ITimeConverter.convertToTimestamp}. */
  toTimestamp(date: TDate): EpochMilliseconds;
  /** Converts epoch milliseconds to a `TDate` - same as {@link ITimeConverter.convertToUtcDate}. */
  fromTimestamp(timestampMs: EpochMilliseconds): TDate;
  /** Number of minutes in an hour for this calendar's timekeeping - `60` for Gregorian. */
  minutesPerHour(): number;
  /** Number of hours in a day for this calendar's timekeeping - `24` for Gregorian. */
  hoursPerDay(): number;
  /** Number of days in a week for this calendar - `7` for Gregorian. */
  daysPerWeek(): number;
  /** Number of months in a year for this calendar - `12` for Gregorian. */
  monthsPerYear(): number;
  /** The largest a day-of-month value can ever be for this calendar - `31` for Gregorian. */
  maxDayOfMonth(): number;
  /**
   * The names this calendar gives its months, in calendar order - index 0 names month 1. Empty
   * when this calendar names no months, in which case only numeric month values are accepted.
   * Matched case-insensitively by consumers.
   */
  readonly monthNames: readonly TMonthName[];
  /** The names this calendar gives its weekdays, in calendar order - see {@link monthNames}. */
  readonly weekdayNames: readonly TWeekdayName[];
  /**
   * Normalizes possibly out-of-range `fields` (e.g. minute 65, month 13) via this calendar's own
   * carry rules, same as how out-of-range arguments to `new Date(...)` roll over - timezone-
   * independent, pure calendar-field arithmetic, unrelated to any real instant. Distinct from
   * {@link ICalendarScheme.compose}: repeatedly normalizing (rather than composing) while
   * searching for a candidate date, and only resolving to a real `TDate`/instant once a match is
   * found, keeps a DST transition from perturbing every step along the way to the answer instead
   * of just the answer itself.
   */
  normalize(fields: ComposableCalendarSchemeFields): CalendarSchemeFields;
  /** Decomposes `date` into its wall-clock calendar fields, as observed in `timezone`. */
  decompose(date: TDate, timezone: TimezoneDefinition): CalendarSchemeFields;
  /**
   * Constructs a `TDate` from `fields` (already in range - see {@link ICalendarScheme.normalize}
   * for fields that might not be), interpreted as local time in `timezone`. For a timezone-aware
   * adapter, this is where DST ambiguity (a skipped or repeated wall-clock instant) is resolved.
   */
  compose(fields: ComposableCalendarSchemeFields, timezone: TimezoneDefinition): TDate;
}

//#endregion

//#region Parser
// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface IWithParser<TParser> {
  /**
   * Get the current configured parser
   */
  get parser(): TParser;
}

/**
 * A parser that only exposes parsing to UTC.
 */
export interface IUtcOnlyParser<TDate> {
  /**
   * Parses `time` into a UTC time `TDate` instance.
   *
   * Accepts an ISO 8601 time string, an epoch-milliseconds number, or an already-parsed `TDate`.
   * Other string formats (e.g. RFC 2822, or a date library's own non-ISO `toString()`
   * output) are not supported and may throw or produce an unspecified
   * result depending on the underlying date library.
   * @returns a TDate expressed as UTC time.
   */
  parseToUtc(time: string | number | TDate): TDate;
}

/**
 * A parser that only exposes parsing to local time.
 */
interface ILocalOnlyParser<TDate> {
  /**
   * Parses `time` into a local time `TDate` instance.
   *
   * Accepts an ISO 8601 time string, an epoch-milliseconds number, or an already-parsed `TDate`.
   * Other string formats (e.g. RFC 2822, or a date library's own non-ISO `toString()`
   * output) are not supported and may throw or produce an unspecified
   * result depending on the underlying date library.
   * @returns a TDate expressed as local time.
   */
  parseToLocal(time: string | number | TDate): TDate;
}

/**
 * Parses raw input into either UTC or local `TDate` instances.
 */
export interface IParser<TDate> extends IUtcOnlyParser<TDate>, ILocalOnlyParser<TDate> {}
//#endregion

//#region Scheduler
// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Discriminates what a {@link DueHandle} was obtained from.
 */
export const TIMER_KIND_TIMEOUT = 0;
export const TIMER_KIND_INTERVAL = 1;
export const TIMER_KIND_RECURRING = 2;
export type TimerKind =
  | typeof TIMER_KIND_TIMEOUT
  | typeof TIMER_KIND_INTERVAL
  | typeof TIMER_KIND_RECURRING;

/**
 * Time handle returned by any of the timer methods ({@link ITimers.once}, {@link ITimers.every} and
 * {@link ITimers.recurring}).
 */
export interface ITimerHandle extends IDisposable, IAbortable {
  readonly kind: TimerKind;
}

/**
 * Additionnal options to create a timer.
 */
export interface ITimerOptions {
  signal?: AbortSignal;
}

/**
 * Schedules timers.
 *
 * Execution model depends on the clock strategy backing this scheduler:
 * - On a **system** clock, timer callbacks run asynchronously via the real, native
 *   timers, exactly like in production code.
 * - On a **manual** or **sequential** clock, callbacks run synchronously,
 *   in-line, as soon as they become due - as a direct side effect of
 *   {@link ITimers.setTimeout}/{@link ITimers.setInterval} itself
 *   (e.g. a delay of `0` or a negative value is already due when scheduled),
 *   or of any call that moves the clock forward (`advance()`,
 *   `clock.localNow()`, `clock.utcNow()`). There is no event loop tick
 *   involved: a due callback has already run by the time the triggering call
 *   returns.
 * - On a **fixed** clock, time never advances, so no scheduled callback is
 *   ever due - it never runs, regardless of the delay it was registered with.
 *
 * On a manual/sequential clock, a callback that throws is handled to match what a native timer
 * callback throwing would actually do in the current environment: the error propagates out of the
 * triggering call in a Node-like environment, and is logged via `console.error` and swallowed in a
 * browser-like one.
 */
export interface ITimers {
  /** One-shot timer. */
  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): ITimerHandle;

  /** A "promise” variant of the `once` one-shot. */
  wait(delay: IDurationSpec, options?: ITimerOptions): Promise<void>;

  /** Fixed-interval timer. */
  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): ITimerHandle;

  /** Dynamic recurrence: The callback determines the next interval; `false` stops it. */
  recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): ITimerHandle;
}

interface IWithTimers {
  /**
   * Get the current configured scheduler
   */
  get timers(): ITimers;
}

interface IClearTimers<TDate> {
  clearTimer<TNativeHandle>(handle: TimerHandle<TDate, TNativeHandle>): void;
}

//#endregion

//#region Runtime
// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

/**
 * Handles the time conversions for a Runtime. This is only used for Plugins.
 */
export interface ITimeConverter<TDate> {
  /**
   * Converts `time` to epoch milliseconds.
   */
  convertToTimestamp(time: string | EpochMilliseconds | number | TDate): EpochMilliseconds;
  /**
   * Converts `time` to a `TDate` instance expressed in UTC.
   */
  convertToUtcDate(time: string | EpochMilliseconds | TDate): TDate;
  /**
   * Converts `time` to a `TDate` instance expressed in the given local `timezone`.
   */
  convertToLocalDate(timezone: TimezoneDefinition, time: string | EpochMilliseconds | TDate): TDate;
  /**
   * This plugin's own {@link ICalendarScheme}, when it diverges from (or supports an operation
   * the) shared Gregorian/`Intl` default (can't). Omit to inherit that default.
   */
  readonly calendarScheme?: ICalendarScheme<TDate>;
}

/**
 * Supplies the {@link ICalendarScheme} backing a runtime's date library: the plugin's own, when
 * it provides one via {@link ITimeConverter.calendarScheme}, otherwise a shared Gregorian/`Intl`
 * default.
 *
 * Deliberately on the runtime rather than on {@link IUtcOnlyClock}: calendar-consuming addons
 * (e.g. cron) are handed the runtime itself by `applyToRuntime`, so they reach the adapter with
 * full type safety from here, while an ordinary consumer holding an {@link ITimeProvider} never
 * sees it on `clock`.
 */
export interface IWithCalendarScheme<TDate> {
  /** This runtime's calendar scheme - see {@link ICalendarScheme}. */
  get calendarScheme(): ICalendarScheme<TDate>;
}

/**
 * A runtime backed by a timezone-aware clock.
 */
export interface IRuntime<TDate>
  extends
    IDisposable,
    IAbortable,
    ITimers,
    IClearTimers<TDate>,
    IClock<TDate>,
    IParser<TDate>,
    ITimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon): void;
}

/**
 * A runtime backed by an UTC only clock.
 */
export interface IUtcOnlyRuntime<TDate>
  extends
    IDisposable,
    IAbortable,
    ITimers,
    IClearTimers<TDate>,
    IUtcOnlyClock<TDate>,
    IUtcOnlyParser<TDate>,
    IUtcOnlyTimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon): void;
}

/**
 * A runtime backed by a manual clock.
 */
export interface IManualRuntime<TDate>
  extends
    IDisposable,
    IAbortable,
    IManualClock<TDate>,
    IWithClock<IManualClock<TDate>>,
    ITimers,
    IClearTimers<TDate>,
    IClock<TDate>,
    IParser<TDate>,
    IManualTimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon): void;
}

/**
 * A runtime backed by an UTC only manual clock.
 */
export interface IUtcOnlyManualRuntime<TDate>
  extends
    IDisposable,
    IAbortable,
    IUtcOnlyManualClock<TDate>,
    IWithClock<IUtcOnlyManualClock<TDate>>,
    ITimers,
    IClearTimers<TDate>,
    IUtcOnlyClock<TDate>,
    IUtcOnlyParser<TDate>,
    IUtcOnlyManualTimeProvider<TDate>,
    IWithCalendarScheme<TDate> {
  registerAddon(addon: IAddon): void;
}
//#endregion

//#region Time provider facades
// ---------------------------------------------------------------------------
// Time provider facades
// ---------------------------------------------------------------------------

/**
 * The public facade of a Time-Provider: exposes its `clock`, `scheduler`, `parser`, and
 * `performance`, backed by a timezone-aware clock.
 */
export interface ITimeProvider<TDate>
  extends
    IDisposable,
    IAbortable,
    IWithClock<IClock<TDate>>,
    IWithTimers,
    IWithParser<IParser<TDate>>,
    IWithPerformance {}

/**
 * The public facade of a Time-Provider backed by a timezone-naive (UTC only) clock.
 */
export interface IUtcOnlyTimeProvider<TDate>
  extends
    IDisposable,
    IAbortable,
    IWithClock<IUtcOnlyClock<TDate>>,
    IWithTimers,
    IWithParser<IUtcOnlyParser<TDate>>,
    IWithPerformance {}

/**
 * The public facade of a Time-Provider backed by a manual (advanceable), timezone-aware clock.
 */
export interface IManualTimeProvider<TDate>
  extends
    IDisposable,
    IAbortable,
    IWithClock<IManualClock<TDate>>,
    IWithTimers,
    IWithParser<IParser<TDate>>,
    IWithPerformance {}

/**
 * The public facade of a Time-Provider backed by a manual (advanceable), timezone-naive
 * (UTC only) clock.
 */
export interface IUtcOnlyManualTimeProvider<TDate>
  extends
    IDisposable,
    IAbortable,
    IWithClock<IUtcOnlyManualClock<TDate>>,
    IWithTimers,
    IWithParser<IUtcOnlyParser<TDate>>,
    IWithPerformance {}
//#endregion

//#region Plugins
// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

/**
 * A plugin capable of producing a system (real time) runtime, backed by a
 * timezone-aware date library.
 */
export interface ISystemPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   */
  readonly supportsLocalTime: true;
  /**
   * Create a runtime for system time and scheduler
   */
  createSystemRuntime(localTimezone: TimezoneDefinition): IRuntime<TDate>;
}

/**
 * A plugin capable of producing a system (real time) runtime, backed by a
 * timezone-naive date library (UTC only).
 */
export interface IUtcOnlySystemPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   */
  readonly supportsLocalTime: false;
  /**
   * Create a UTC only runtime for system time and scheduler
   */
  createSystemRuntime(): IUtcOnlyRuntime<TDate>;
}

/**
 * A plugin capable of deterministic runtimes,
 * backed by a timezone-aware date library.
 */
export interface IDeterministicPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   */
  readonly supportsLocalTime: true;
  /**
   * Create a runtime for manual time and scheduler
   */
  createManualRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IManualRuntime<TDate>;
  /**
   * Create a runtime for fixed time and scheduler
   */
  createFixedRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IRuntime<TDate>;
  /**
   * Create a runtime for sequential time and scheduler.
   *
   * @param sequentialTimes the sequence to step through. If empty, the resulting clock stays at the Unix epoch.
   */
  createSequentialRuntime(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ): IRuntime<TDate>;
}

/**
 * A plugin capable of producing deterministic runtimes,
 * backed by a timezone-naive date library (UTC only).
 */
export interface IUtcOnlyDeterministicPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   */
  readonly supportsLocalTime: false;
  /**
   * Create a runtime for manual time and scheduler
   */
  createManualRuntime(
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IUtcOnlyManualRuntime<TDate>;
  /**
   * Create a runtime for fixed time and scheduler
   */
  createFixedRuntime(
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IUtcOnlyRuntime<TDate>;
  /**
   * Create a runtime for sequential time and scheduler.
   *
   * @param sequentialTimes the sequence to step through. If empty, the resulting clock stays at the Unix epoch.
   */
  createSequentialRuntime(
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ): IUtcOnlyRuntime<TDate>;
}
//#endregion
