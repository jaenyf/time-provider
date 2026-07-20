import { BaseManualRuntime } from "@time-provider/core";
import { DateTime } from "luxon";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class ManualRuntime extends BaseManualRuntime<DateTime<boolean>> {
  protected advanceYears(time: DateTime<boolean>, years: number): DateTime<boolean> {
    return time.plus({ years });
  }
  protected advanceMonths(time: DateTime<boolean>, months: number): DateTime<boolean> {
    return time.plus({ months });
  }
  protected advanceDays(time: DateTime<boolean>, days: number): DateTime<boolean> {
    return time.plus({ days });
  }
  protected advanceHours(time: DateTime<boolean>, hours: number): DateTime<boolean> {
    return time.plus({ hours });
  }
  protected advanceMinutes(time: DateTime<boolean>, minutes: number): DateTime<boolean> {
    return time.plus({ minutes });
  }
  protected advanceSeconds(time: DateTime<boolean>, seconds: number): DateTime<boolean> {
    return time.plus({ seconds });
  }
  protected advanceMilliseconds(time: DateTime<boolean>, milliseconds: number): DateTime<boolean> {
    return time.plus({ milliseconds });
  }
  protected convertToEpochTimestampImpl(time: string | number | DateTime<boolean>): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
    return RuntimeHelper.convertToDate(time);
  }
}
