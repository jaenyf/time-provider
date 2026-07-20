import { BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { Temporal } from "@js-temporal/polyfill";

export class SystemRuntime extends BaseSystemRuntime<Temporal.ZonedDateTime> {
  localNow(timezone?: TimezoneDefinition): Temporal.ZonedDateTime {
    return RuntimeHelper.convertToLocalDate(
      timezone ? timezone : this.localTimezone,
      this.utcNow(),
    );
  }
  utcNow(): Temporal.ZonedDateTime {
    return Temporal.Now.zonedDateTimeISO("UTC");
  }
  protected convertToEpochTimestampImpl(time: string | number | Temporal.ZonedDateTime): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(
    time: string | number | Temporal.ZonedDateTime,
  ): Temporal.ZonedDateTime {
    return RuntimeHelper.convertToUtcDate(time);
  }
  protected convertToLocalDateImpl(
    timezone: TimezoneDefinition,
    time: string | number | Temporal.ZonedDateTime,
  ): Temporal.ZonedDateTime {
    return RuntimeHelper.convertToLocalDate(timezone, time);
  }
}
