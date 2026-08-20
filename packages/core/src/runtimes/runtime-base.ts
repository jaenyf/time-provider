import { DefaultCalendarScheme } from "../calendar/default-calendar-scheme.ts";
import type {
  ITimerHandle,
  ICalendarScheme,
  IClock,
  IParser,
  IPerformance,
  IRuntime,
  ITimers,
  ITimeConverter,
  TimezoneDefinition,
  ITimerOptions,
  EpochMilliseconds,
} from "../types/types.ts";
import type { TimerHandle } from "./timer-handle.ts";
import { type IDurationSpec } from "../helpers/branded-types.ts";
import type { IAddon } from "../deterministic.ts";

export class SystemHelper {
  static getRealHostTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

/**
 * Guards for validating time and timezone inputs. Intended for plugin authors implementing
 * {@link ITimeConverter} or a runtime's clock methods.
 */
export class TimeInputValidator {
  /**
   * Guards against invalid values.
   * @throws if `time` is `undefined`, `null`, `NaN`, or an empty/whitespace-only string.
   */
  /* @__INLINE__ */
  static assertValid<TDate>(
    time: string | number | TDate,
  ): asserts time is string | number | TDate {
    if (
      time === undefined ||
      time === null ||
      (typeof time === "number" && Number.isNaN(time)) ||
      (typeof time === "string" && time.trim() === "")
    ) {
      this.throwInvalidTimeValue(time);
    }
  }

  /**
   * Throws an error describing `time` as an invalid time value.
   */
  /* @__INLINE__ */
  static throwInvalidTimeValue<TDate>(time: string | number | TDate): never {
    throw new Error(`Invalid time value (value was '${String(time)}')`);
  }

  /**
   * Throws an error describing `timezone` as an invalid timezone value.
   */
  /* @__INLINE__ */
  static throwInvalidTimezone(timezone: TimezoneDefinition): never {
    throw new Error(`Invalid timezone value (value was '${String(timezone)}')`);
  }
}

/**
 * Base class for all runtime classes
 * A runtime is an orchestrator (coordinator) between a clock and a scheduler
 */
export abstract class BaseRuntime<TDate> implements IRuntime<TDate> {
  static readonly ABORTED_SIGNAL: AbortSignal = AbortSignal.abort();
  #localTimezone: TimezoneDefinition;
  #converter: ITimeConverter<TDate>;
  #performance: IPerformance;
  #calendarScheme: ICalendarScheme<TDate>;
  #isDisposed: boolean;
  #abortControler?: AbortController;
  #timersHandles: Set<ITimerHandle>;
  #appliedAddons: Set<IAddon>;
  protected constructor(
    localTimezone: TimezoneDefinition,
    converter: ITimeConverter<TDate>,
    performance: IPerformance,
  ) {
    this.#isDisposed = false;
    this.#abortControler = undefined;
    this.#timersHandles = new Set<ITimerHandle>();
    this.#appliedAddons = new Set<IAddon>();
    this.#localTimezone = localTimezone;
    this.#converter = converter;
    this.#performance = performance;
    this.#calendarScheme = converter.calendarScheme ?? new DefaultCalendarScheme(converter);
  }

  registerAddon(addon: IAddon): void {
    this.#appliedAddons.add(addon);
  }

  protected trackHandle(handle: ITimerHandle, options?: ITimerOptions): ITimerHandle {
    this.#timersHandles.add(handle);
    BaseRuntime.ensureTimerDisposalOnAbort(handle, options);
    return handle;
  }

  protected untrackHandle(handle: ITimerHandle): void {
    this.#timersHandles.delete(handle);
  }

  get isDisposed() {
    return this.#isDisposed;
  }

  get signal(): AbortSignal {
    if (this.#isDisposed === true) {
      return BaseRuntime.ABORTED_SIGNAL;
    }
    if (this.#abortControler === undefined) {
      this.#abortControler = new AbortController();
      this.#abortControler.signal.addEventListener("abort", () => {
        this.dispose();
      });
    }
    return this.#abortControler.signal;
  }

  private disposeTimersHandles(): void {
    for (const handle of this.#timersHandles) {
      handle.dispose();
    }
    this.#timersHandles.clear();
  }

  private disposeAddons(): void {
    for (const addon of this.#appliedAddons) {
      addon.dispose();
    }
    this.#appliedAddons.clear();
  }

  dispose(): void {
    if (this.#isDisposed) {
      return;
    }
    if (this.#abortControler !== undefined) {
      this.#abortControler.abort("Time-Provider runtime is being disposed");
    }
    this.disposeTimersHandles();
    this.disposeAddons();
    this.#isDisposed = true;
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  protected get localTimezone(): TimezoneDefinition {
    return this.#localTimezone;
  }

  get clock(): IClock<TDate> {
    return this;
  }
  get timers(): ITimers {
    return this;
  }
  get parser(): IParser<TDate> {
    return this;
  }
  get performance(): IPerformance {
    return this.#performance;
  }

  protected static ensureTimerDisposalOnAbort(handle: ITimerHandle, options?: ITimerOptions) {
    if (options?.signal) {
      if (options.signal.aborted) {
        handle.dispose();
      } else {
        const onAbort = () => handle.dispose();
        options.signal.addEventListener("abort", onAbort, { once: true });
      }
    }
  }

  abstract clearTimer<TNativeHandle>(handle: TimerHandle<TDate, TNativeHandle>): void;
  abstract once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): ITimerHandle;
  abstract every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): ITimerHandle;
  abstract recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): ITimerHandle;
  wait(delay: IDurationSpec, options?: ITimerOptions): Promise<void> {
    return new Promise((resolve) => {
      this.once(delay, () => resolve(), options);
    });
  }

  hostTimezone(): TimezoneDefinition {
    return SystemHelper.getRealHostTimezone();
  }

  get timezone(): string {
    return this.#localTimezone;
  }

  abstract timestampNow(): EpochMilliseconds;
  abstract localNow(): TDate;
  abstract utcNow(): TDate;

  /**
   * This runtime's calendar scheme - the plugin's own {@link ITimeConverter.calendarScheme} if
   * it provided one, otherwise the shared Gregorian/`Intl` default.
   */
  get calendarScheme(): ICalendarScheme<TDate> {
    return this.#calendarScheme;
  }

  withTimezone(localTimezone: TimezoneDefinition): this {
    this.#localTimezone = localTimezone;
    return this;
  }

  /**
   * Parses any accepted input (an ISO string, an epoch-milliseconds number, or a TDate) into a normalized TDate instance.
   * @returns a TDate expressed as UTC time.
   */
  parseToUtc = (time: string | EpochMilliseconds | TDate) => {
    /*
     * The input is first converted to a TDate (accepting any of the three
     * input shapes), then round-tripped through a timestamp and back to a
     * TDate again. This ensures the result is always a fresh, canonical
     * instance produced the same way regardless of what shape the input was,
     * rather than potentially returning the original object as-is.
     */

    return this.convertToUtcDateImpl(
      this.convertToEpochTimestampImpl(this.convertToUtcDateImpl(time)),
    );
  };
  /**
   * Parses any accepted input (an ISO string, an epoch-milliseconds number, or a TDate) into a normalized TDate instance.
   * @returns a TDate expressed as local time.
   */
  parseToLocal = (time: string | EpochMilliseconds | TDate) => {
    /*
     * The input is first converted to a TDate (accepting any of the three
     * input shapes), then round-tripped through a timestamp and back to a
     * TDate again. This ensures the result is always a fresh, canonical
     * instance produced the same way regardless of what shape the input was,
     * rather than potentially returning the original object as-is.
     */

    return this.convertToLocalDateImpl(
      this.#localTimezone,
      this.convertToEpochTimestampImpl(this.convertToUtcDateImpl(time)),
    );
  };
  protected convertToUtcDateImpl(time: string | EpochMilliseconds | TDate): TDate {
    return this.#converter.convertToUtcDate(time);
  }
  protected convertToLocalDateImpl(
    timezone: TimezoneDefinition,
    time: string | EpochMilliseconds | TDate,
  ): TDate {
    return this.#converter.convertToLocalDate(timezone, time);
  }
  protected convertToEpochTimestampImpl(
    time: string | EpochMilliseconds | number | TDate,
  ): EpochMilliseconds {
    return this.#converter.convertToTimestamp(time);
  }
}
