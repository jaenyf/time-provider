import { type IManualTimeAdapter, type IAdvanceConfiguration } from "@time-provider/core";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";

export class ManualTimeAdapter extends FixedTimeAdapter implements IManualTimeAdapter<Date> {
  constructor(time: string | number | Date) {
    super(time);
  }
  advance(advanceConfiguration: IAdvanceConfiguration): IManualTimeAdapter<Date> {
    const time = this.utcNow();
    if (advanceConfiguration.days) {
      time.setDate(time.getDate() + advanceConfiguration.days);
    }
    if (advanceConfiguration.hours) {
      time.setHours(time.getHours() + advanceConfiguration.hours);
    }
    if (advanceConfiguration.milliseconds) {
      time.setMilliseconds(time.getMilliseconds() + advanceConfiguration.milliseconds);
    }
    if (advanceConfiguration.minutes) {
      time.setMinutes(time.getMinutes() + advanceConfiguration.minutes);
    }
    if (advanceConfiguration.months) {
      time.setMonth(time.getMonth() + advanceConfiguration.months);
    }
    if (advanceConfiguration.seconds) {
      time.setSeconds(time.getSeconds() + advanceConfiguration.seconds);
    }
    if (advanceConfiguration.years) {
      time.setFullYear(time.getFullYear() + advanceConfiguration.years);
    }
    this.setDeterminedTime(time);
    return this;
  }
}
