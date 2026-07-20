import { BaseFixedRuntime, type TimezoneDefinition } from "@time-provider/core";
import dayjs from "dayjs";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class FixedRuntime extends BaseFixedRuntime<dayjs.Dayjs> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | dayjs.Dayjs) {
    super(localTimezone, fixedTime);
  }

  protected convertToEpochTimestampImpl(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return RuntimeHelper.convertToUtcDate(time);
  }
  protected convertToLocalDateImpl(
    timezone: TimezoneDefinition,
    time: string | number | dayjs.Dayjs,
  ): dayjs.Dayjs {
    return RuntimeHelper.convertToLocalDate(timezone, time);
  }
}
