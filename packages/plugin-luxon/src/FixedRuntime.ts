import { BaseFixedRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { DateTime } from "luxon";

export class FixedRuntime extends BaseFixedRuntime<DateTime<boolean>> {
  protected convertToTimestampImpl(time: string | number | DateTime<boolean>): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
    return RuntimeHelper.convertToDate(time);
  }
}
