import { BaseSystemRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { DateTime } from "luxon";

export class SystemRuntime extends BaseSystemRuntime<DateTime<boolean>> {
  localNow(): DateTime {
    return DateTime.now();
  }
  utcNow(): DateTime {
    return DateTime.utc();
  }
  protected convertToEpochTimestampImpl(time: string | number | DateTime<boolean>): number {
    return RuntimeHelper.convertToTimestamp(time);
  }

  protected convertToUtcDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
    return RuntimeHelper.convertToDate(time);
  }
}
