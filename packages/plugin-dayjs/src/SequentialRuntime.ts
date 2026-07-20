import { BaseSequentialRuntime, type TimezoneDefinition } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class SequentialRuntime extends BaseSequentialRuntime<Dayjs> {
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
