import type { IClock } from "../clock/IClock.ts";
import type { IParser } from "../parser/IParser.ts";
import type { IScheduler, SetIntervalHandle, SetTimeoutHandle } from "../scheduler/IScheduler.ts";
import type { IRuntime } from "./IRuntime.ts";

/**
 * Base class for all runtime classes
 * A runtime is an orchestrator (coordinator) between a clock and a scheduler
 */
export abstract class BaseRuntime<TDate> implements IRuntime<TDate> {
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

  abstract localNow(): TDate;
  abstract utcNow(): TDate;

  /**
   * Parses any accepted input (an ISO string, an epoch-milliseconds number,
   * or a TDate) into a normalized TDate instance.
   */
  parse = (time: string | number | TDate) => {
    /*
     * The input is first converted to a TDate (accepting any of the three
     * input shapes), then round-tripped through a timestamp and back to a
     * TDate again. This ensures the result is always a fresh, canonical
     * instance produced the same way regardless of what shape the input was,
     * rather than potentially returning the original object as-is.
     */
    return this.convertToDateImpl(this.convertToTimestampImpl(this.convertToDateImpl(time)));
  };
  protected abstract convertToDateImpl(time: string | number | TDate): TDate;
  protected abstract convertToTimestampImpl(time: string | number | TDate): number;
}
