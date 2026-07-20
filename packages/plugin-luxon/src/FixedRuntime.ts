import { BaseFixedRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { DateTime } from "luxon";

export class FixedRuntime extends BaseFixedRuntime<DateTime<boolean>> {
  protected convertToEpochTimestampImpl(time: string | number | DateTime<boolean>): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
    return RuntimeHelper.convertToUtcDate(time);
  }
  protected convertToLocalDateImpl(
    timezone: TimezoneDefinition,
    time: string | number | DateTime<boolean>,
  ): DateTime<boolean> {
    return RuntimeHelper.convertToLocalDate(timezone, time);
  }
}
