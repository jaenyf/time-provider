import {
  type IAdvanceConfiguration,
  BaseManualRuntime,
  type IManualRuntime,
} from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class ManualRuntime extends BaseManualRuntime<Date> {
  override advanceImpl(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<Date> {
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
  protected convertToTimestampImpl(time: string | number | Date): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | Date): Date {
    return RuntimeHelper.convertToDate(time);
  }
}
