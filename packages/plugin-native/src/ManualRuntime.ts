import { BaseManualRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class ManualRuntime extends BaseManualRuntime<Date> {
  protected advanceYears(time: Date, years: number): Date {
    time.setFullYear(time.getFullYear() + years);
    return time;
  }
  protected advanceMonths(time: Date, months: number): Date {
    time.setMonth(time.getMonth() + months);
    return time;
  }
  protected advanceDays(time: Date, days: number): Date {
    time.setDate(time.getDate() + days);
    return time;
  }
  protected advanceHours(time: Date, hours: number): Date {
    time.setHours(time.getHours() + hours);
    return time;
  }
  protected advanceMinutes(time: Date, minutes: number): Date {
    time.setMinutes(time.getMinutes() + minutes);
    return time;
  }
  protected advanceSeconds(time: Date, seconds: number): Date {
    time.setSeconds(time.getSeconds() + seconds);
    return time;
  }
  protected advanceMilliseconds(time: Date, milliseconds: number): Date {
    time.setMilliseconds(time.getMilliseconds() + milliseconds);
    return time;
  }
  protected convertToEpochTimestampImpl(time: string | number | Date): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | Date): Date {
    return RuntimeHelper.convertToDate(time);
  }
}
