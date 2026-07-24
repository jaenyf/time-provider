/**
 * All pure, type-only contracts of the library are here.
 * None of them cause JavaScript to be emited, so it has no effect on bundle size or tree-shaking.
 */

//#region Clock
// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

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
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
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
 * A clock that only exposes UTC time.
 */
interface IUtcOnlyClock<TDate> {
  /**
   * Returns the time as of now in UTC.
   */
  utcNow(): TDate;
}

interface ILocalOnlyClock<TDate> {
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

export interface IClock<TDate> extends IUtcOnlyClock<TDate>, ILocalOnlyClock<TDate> {}

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
 * A parser that only exposes parsing to UTC.
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

export interface IParser<TDate> extends IUtcOnlyParser<TDate>, ILocalOnlyParser<TDate> {}
//#endregion

//#region Scheduler
// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export type SetTimeoutHandle = ReturnType<typeof setTimeout>;
export type SetIntervalHandle = ReturnType<typeof setInterval>;

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
  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle;
  /**
   * Cancels a pending timeout scheduled via {@link IScheduler.setTimeout}.
   * A no-op if it already ran or was already cleared.
   */
  clearTimeout(handle: SetTimeoutHandle): void;
  /**
   * Schedules `callback` to run repeatedly, every `millisecondsDelay`
   * milliseconds (0 if omitted or negative). See {@link IScheduler} for when
   * each run actually happens depending on the clock strategy.
   */
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle;
  /**
   * Cancels a pending interval scheduled via {@link IScheduler.setInterval}.
   * A no-op if it was already cleared.
   */
  clearInterval(handle: SetIntervalHandle): void;
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
  convertToTimestamp(time: string | number | TDate): number;
  convertToUtcDate(time: string | number | TDate): TDate;
  convertToLocalDate(timezone: TimezoneDefinition, time: string | number | TDate): TDate;
}

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

export interface ITimeProvider<TDate>
  extends IClockProvider<IClock<TDate>>, ISchedulerProvider, IParserProvider<IParser<TDate>> {}

export interface IUtcOnlyTimeProvider<TDate>
  extends
    IClockProvider<IUtcOnlyClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IUtcOnlyParser<TDate>> {}

export interface IManualTimeProvider<TDate>
  extends
    IClockProvider<IManualClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IParser<TDate>> {}

export interface IUtcOnlyManualTimeProvider<TDate>
  extends
    IClockProvider<IUtcOnlyManualClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IUtcOnlyParser<TDate>> {}
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
   * Create a runtime for sequential time and scheduler
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
   * Create a runtime for sequential time and scheduler
   */
  createSequentialRuntime(sequentialTimes: (string | number | TDate)[]): IUtcOnlyRuntime<TDate>;
}
//#endregion
