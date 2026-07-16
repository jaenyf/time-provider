import { BaseManualRuntime } from "@time-provider/core";
import dayjs from "dayjs";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class ManualRuntime extends BaseManualRuntime<dayjs.Dayjs> {
  protected advanceYears(time: dayjs.Dayjs, years: number): dayjs.Dayjs {
    return time.add(years, "year");
  }
  protected advanceMonths(time: dayjs.Dayjs, months: number): dayjs.Dayjs {
    return time.add(months, "month");
  }
  protected advanceDays(time: dayjs.Dayjs, days: number): dayjs.Dayjs {
    return time.add(days, "day");
  }
  protected advanceHours(time: dayjs.Dayjs, hours: number): dayjs.Dayjs {
    return time.add(hours, "hour");
  }
  protected advanceMinutes(time: dayjs.Dayjs, minutes: number): dayjs.Dayjs {
    return time.add(minutes, "minute");
  }
  protected advanceSeconds(time: dayjs.Dayjs, seconds: number): dayjs.Dayjs {
    return time.add(seconds, "second");
  }
  protected advanceMilliseconds(time: dayjs.Dayjs, milliseconds: number): dayjs.Dayjs {
    return time.add(milliseconds, "millisecond");
  }
  protected convertToTimestampImpl(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return RuntimeHelper.convertToDate(time);
  }
}
