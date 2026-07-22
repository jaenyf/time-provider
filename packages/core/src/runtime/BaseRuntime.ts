import type { IClock } from "../clock/IClock.ts";
import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { IParser } from "../parser/IParser.ts";
import type { IScheduler, SetIntervalHandle, SetTimeoutHandle } from "../scheduler/IScheduler.ts";
import type { ITimeConverter } from "./ITimeConverter.ts";
import type { IRuntime } from "./IRuntime.ts";

/**
 * Base class for all runtime classes
 * A runtime is an orchestrator (coordinator) between a clock and a scheduler
 */
export abstract class BaseRuntime<TDate> implements IRuntime<TDate> {
  #localTimezone: TimezoneDefinition;
  #converter: ITimeConverter<TDate>;
  protected constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    this.#localTimezone = localTimezone;
    this.#converter = converter;
  }

  protected get localTimezone(): TimezoneDefinition {
    return this.#localTimezone;
  }

  get clock(): IClock<TDate> {
    return this;
  }
  get scheduler(): IScheduler {
    return this;
  }
  get parser(): IParser<TDate> {
    return this;
  }

  abstract setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle;
  abstract clearTimeout(handle: SetTimeoutHandle): void;
  abstract setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle;
  abstract clearInterval(handle: SetTimeoutHandle): void;

  hostTimezone(): TimezoneDefinition {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  abstract localNow(): TDate;
  abstract utcNow(): TDate;
  withLocalTimezone(localTimezone: TimezoneDefinition): this {
    this.#localTimezone = localTimezone;
    return this;
  }

  /**
   * Parses any accepted input (an ISO string, an epoch-milliseconds number, or a TDate) into a normalized TDate instance.
   * @returns a TDate expressed as UTC time.
   */
  parseToUtc = (time: string | number | TDate) => {
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
  parseToLocal = (time: string | number | TDate) => {
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
  protected convertToUtcDateImpl(time: string | number | TDate): TDate {
    return this.#converter.convertToUtcDate(time);
  }
  protected convertToLocalDateImpl(
    timezone: TimezoneDefinition,
    time: string | number | TDate,
  ): TDate {
    return this.#converter.convertToLocalDate(timezone, time);
  }
  protected convertToEpochTimestampImpl(time: string | number | TDate): number {
    return this.#converter.convertToTimestamp(time);
  }
}
