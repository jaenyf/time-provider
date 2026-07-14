import type { IScheduler, SetIntervalHandle, SetTimeoutHandle } from "../scheduler/IScheduler.ts";
import type { IRuntime } from "./IRuntime.ts";

/**
 * Base class for all runtime classes
 * A runtime is an orchestrator (coordinator) between a clock and a scheduler
 */
export abstract class BaseRuntime<TDate> implements IRuntime<TDate> {
  get scheduler(): IScheduler {
    return this;
  }
  abstract setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle;
  abstract clearTimeout(handle: SetTimeoutHandle): void;
  abstract setInterval(millisecondsDelay: number, callback: () => void): SetIntervalHandle;
  abstract clearInterval(handle: SetTimeoutHandle): void;

  abstract localNow(): TDate;
  abstract utcNow(): TDate;

  parse = (time: string | number | TDate) =>
    this.convertToDateImpl(this.convertToTimestampImpl(this.convertToDateImpl(time)));
  protected abstract convertToDateImpl(time: string | number | TDate): TDate;
  protected abstract convertToTimestampImpl(time: string | number | TDate): number;
}
