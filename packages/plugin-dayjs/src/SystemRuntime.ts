import { BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/plugin/utc.js";
import "dayjs/plugin/timezone.js";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class SystemRuntime extends BaseSystemRuntime<Dayjs> {
  localNow(timezone?: TimezoneDefinition): dayjs.Dayjs {
    return dayjs()
      .utc()
      .tz(timezone ? timezone : this.localTimezone);
  }
  utcNow(): dayjs.Dayjs {
    return dayjs.utc();
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
