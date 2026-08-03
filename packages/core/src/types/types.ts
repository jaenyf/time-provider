/**
 * All pure, type-only contracts of the library are here.
 * None of them cause JavaScript to be emited, so it has no effect on bundle size or tree-shaking.
 */

//#region Performance
// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

interface IPerformanceProvider {
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
  readonly startTime: number;
  /**
   * The duration of the entry, in milliseconds. Always `0` for a mark.
   */
  readonly duration: number;
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
  startTime?: number;

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
  start?: string | number;

  /**
   * The end point of the measurement.
   *
   * Can be:
   * - a mark name
   * - an explicit performance timestamp
   */
  end?: string | number;

  /**
   * Duration to use instead of calculating from start/end.
   */
  duration?: number;

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
  now(): number;

  /**
   * The Unix timestamp at which this performance timeline started.
   */
  readonly timeOrigin: number;

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
   * {@link IScheduler} for details on this execution model.
   */
  advance(advanceOptions: IAdvanceOptions): TSelf;
}

interface IClockProvider<TClock> {
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
   */
  timestampNow(): number;
}

/**
 * A clock that only exposes UTC time.
 */
interface IUtcOnlyClock<TDate> extends ITimestampClock {
  /**
   * Returns the time as of now in UTC.
   */
  utcNow(): TDate;
}

interface ILocalOnlyClock<TDate> extends ITimestampClock {
  /**
   * Returns the time as of now for the local timezone of the runtime.
   * If no local timezone has been specified when building it, is assumed to be "Etc/UTC" (aka. Greenwhich timezone).
   * Therefor, the runtime will not try to guess the host localtime !
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

//#region Parser
// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface IParserProvider<TParser> {
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
 * Opaque handle returned by {@link IScheduler.setTimeout}, {@link IScheduler.setInterval} and
 * {@link IScheduler.setRecurring}. Pass it back to the matching `clear*` method to cancel it -
 * `kind` is for introspection/debugging only, not meant to be branched on by consumers.
 */
export interface DueHandle {
  readonly kind: TimerKind;
}

/**
 * Schedules and cancels timeouts/intervals.
 *
 * Execution model depends on the clock strategy backing this scheduler:
 * - On a **system** clock, callbacks run asynchronously via the real, native
 *   timers, exactly like in production code.
 * - On a **manual** or **sequential** clock, callbacks run synchronously,
 *   in-line, as soon as they become due - as a direct side effect of
 *   {@link IScheduler.setTimeout}/{@link IScheduler.setInterval} itself
 *   (e.g. a delay of `0` or a negative value is already due when scheduled),
 *   or of any call that moves the clock forward (`advance()`,
 *   `clock.localNow()`, `clock.utcNow()`). There is no event loop tick
 *   involved: a due callback has already run by the time the triggering call
 *   returns.
 * - On a **fixed** clock, time never advances, so no scheduled callback is
 *   ever due - it never runs, regardless of the delay it was registered with.
 */
export interface IScheduler {
  /**
   * Schedules `callback` to run once, `millisecondsDelay` milliseconds from
   * now (0 if omitted or negative). See {@link IScheduler} for when the
   * callback actually runs depending on the clock strategy.
   */
  setTimeout(callback: () => void, millisecondsDelay?: number): DueHandle;
  /**
   * Cancels a pending timeout scheduled via {@link IScheduler.setTimeout}.
   * A no-op if it already ran or was already cleared.
   */
  clearTimeout(handle: DueHandle): void;
  /**
   * Schedules `callback` to run repeatedly, every `millisecondsDelay`
   * milliseconds (0 if omitted or negative). See {@link IScheduler} for when
   * each run actually happens depending on the clock strategy.
   */
  setInterval(callback: () => void, millisecondsDelay?: number): DueHandle;
  /**
   * Cancels a pending interval scheduled via {@link IScheduler.setInterval}.
   * A no-op if it was already cleared.
   */
  clearInterval(handle: DueHandle): void;
  /**
   * Schedules `callback` to run once, `initialDelay` milliseconds from now (0 if omitted or
   * negative), then again after whatever delay `callback` itself returns - typically computed
   * from state the run itself just updated (a counter, remaining time, ...). Return `false` to
   * stop recurring; any other falsy value (e.g. `0`) still schedules a run, `0` milliseconds from
   * the previous one. See {@link IScheduler} for when each run actually happens depending on the
   * clock strategy.
   */
  setRecurring(callback: () => number | false, initialDelay?: number): DueHandle;
  /**
   * Cancels a pending recurring schedule started via {@link IScheduler.setRecurring}. A no-op if
   * it already stopped (`callback` returned `false`) or was already cleared.
   */
  clearRecurring(handle: DueHandle): void;
}

interface ISchedulerProvider {
  /**
   * Get the current configured scheduler
   */
  get scheduler(): IScheduler;
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
  convertToTimestamp(time: string | number | TDate): number;
  /**
   * Converts `time` to a `TDate` instance expressed in UTC.
   */
  convertToUtcDate(time: string | number | TDate): TDate;
  /**
   * Converts `time` to a `TDate` instance expressed in the given local `timezone`.
   */
  convertToLocalDate(timezone: TimezoneDefinition, time: string | number | TDate): TDate;
}

/**
 * A runtime backed by a timezone-aware clock.
 */
export interface IRuntime<TDate>
  extends IScheduler, IClock<TDate>, IParser<TDate>, ITimeProvider<TDate> {}

/**
 * A runtime backed by an UTC only clock.
 */
export interface IUtcOnlyRuntime<TDate>
  extends IScheduler, IUtcOnlyClock<TDate>, IUtcOnlyParser<TDate>, IUtcOnlyTimeProvider<TDate> {}

/**
 * A runtime backed by a manual clock.
 */
export interface IManualRuntime<TDate>
  extends
    IManualClock<TDate>,
    IClockProvider<IManualClock<TDate>>,
    IScheduler,
    IClock<TDate>,
    IParser<TDate>,
    IManualTimeProvider<TDate> {}

/**
 * A runtime backed by an UTC only manual clock.
 */
export interface IUtcOnlyManualRuntime<TDate>
  extends
    IUtcOnlyManualClock<TDate>,
    IClockProvider<IUtcOnlyManualClock<TDate>>,
    IScheduler,
    IUtcOnlyClock<TDate>,
    IUtcOnlyParser<TDate>,
    IUtcOnlyManualTimeProvider<TDate> {}
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
    IClockProvider<IClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IParser<TDate>>,
    IPerformanceProvider {}

/**
 * The public facade of a Time-Provider backed by a timezone-naive (UTC only) clock.
 */
export interface IUtcOnlyTimeProvider<TDate>
  extends
    IClockProvider<IUtcOnlyClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IUtcOnlyParser<TDate>>,
    IPerformanceProvider {}

/**
 * The public facade of a Time-Provider backed by a manual (advanceable), timezone-aware clock.
 */
export interface IManualTimeProvider<TDate>
  extends
    IClockProvider<IManualClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IParser<TDate>>,
    IPerformanceProvider {}

/**
 * The public facade of a Time-Provider backed by a manual (advanceable), timezone-naive
 * (UTC only) clock.
 */
export interface IUtcOnlyManualTimeProvider<TDate>
  extends
    IClockProvider<IUtcOnlyManualClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IUtcOnlyParser<TDate>>,
    IPerformanceProvider {}
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
    initialTime: string | number | TDate,
  ): IManualRuntime<TDate>;
  /**
   * Create a runtime for fixed time and scheduler
   */
  createFixedRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ): IRuntime<TDate>;
  /**
   * Create a runtime for sequential time and scheduler.
   *
   * @param sequentialTimes the sequence to step through. If empty, the resulting clock stays at the Unix epoch.
   */
  createSequentialRuntime(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | TDate)[],
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
  createManualRuntime(initialTime: string | number | TDate): IUtcOnlyManualRuntime<TDate>;
  /**
   * Create a runtime for fixed time and scheduler
   */
  createFixedRuntime(initialTime: string | number | TDate): IUtcOnlyRuntime<TDate>;
  /**
   * Create a runtime for sequential time and scheduler.
   *
   * @param sequentialTimes the sequence to step through. If empty, the resulting clock stays at the Unix epoch.
   */
  createSequentialRuntime(sequentialTimes: (string | number | TDate)[]): IUtcOnlyRuntime<TDate>;
}
//#endregion
