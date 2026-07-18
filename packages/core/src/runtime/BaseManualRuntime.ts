import type { IManualRuntime } from "./IManualRuntime.ts";
import { BaseSequentialRuntime } from "./BaseSequentialRuntime.ts";
import type { IAdvanceConfiguration, IManualClock } from "../clock/IManualClock.ts";

/**
 * Base class for a deterministically manual runtime
 */
export abstract class BaseManualRuntime<TDate>
  extends BaseSequentialRuntime<TDate>
  implements IManualRuntime<TDate>
{
  constructor(fixedTime: string | number | TDate) {
    super([fixedTime]);
  }

  protected setDeterminedTime(time: TDate) {
    this._sequentialTimestamps[0] = this.convertToTimestampImpl(time);
  }

  get clock(): IManualClock<TDate> {
    return this;
  }

  advance(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<TDate> {
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
