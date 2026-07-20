import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { ITimeConverter } from "./ITimeConverter.ts";
import { BaseDeterministicRuntime } from "./BaseDeterministicRuntime.ts";

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
