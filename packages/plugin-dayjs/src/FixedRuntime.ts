import { BaseFixedRuntime } from "@time-provider/core";
import dayjs from "dayjs";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class FixedRuntime extends BaseFixedRuntime<dayjs.Dayjs> {
  protected convertToEpochTimestampImpl(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return RuntimeHelper.convertToDate(time);
  }
}
