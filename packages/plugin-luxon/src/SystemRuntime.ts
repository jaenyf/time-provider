import { BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { DateTime } from "luxon";

export class SystemRuntime extends BaseSystemRuntime<DateTime<boolean>> {
  localNow(): DateTime<boolean> {
    return DateTime.utc().setZone(this.localTimezone);
  }
  utcNow(): DateTime<boolean> {
    return DateTime.utc();
  }
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
