import { BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import moment from "moment-timezone";

export class SystemRuntime extends BaseSystemRuntime<moment.Moment> {
  localNow(timezone?: TimezoneDefinition): moment.Moment {
    return moment.utc().tz(timezone ? timezone : this.localTimezone);
  }
  utcNow(): moment.Moment {
    return moment.utc();
  }
  protected convertToEpochTimestampImpl(time: string | number | moment.Moment): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | moment.Moment): moment.Moment {
    return RuntimeHelper.convertToUtcDate(time);
  }
  protected convertToLocalDateImpl(
    timezone: TimezoneDefinition,
    time: string | number | moment.Moment,
  ): moment.Moment {
    return RuntimeHelper.convertToLocalDate(timezone, time);
  }
}
