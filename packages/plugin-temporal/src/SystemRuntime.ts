import { BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { Temporal } from "@js-temporal/polyfill";

export class SystemRuntime extends BaseSystemRuntime<Temporal.Instant> {
  localNow(timezone?: TimezoneDefinition): Temporal.Instant {
    return RuntimeHelper.convertToLocalDate(
      timezone ? timezone : this.localTimezone,
      this.utcNow(),
    );
  }
  utcNow(): Temporal.Instant {
    return Temporal.Now.zonedDateTimeISO("UTC").toInstant();
  }
  protected convertToEpochTimestampImpl(time: string | number | Temporal.Instant): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | Temporal.Instant): Temporal.Instant {
    return RuntimeHelper.convertToUtcDate(time);
  }
  protected convertToLocalDateImpl(
    timezone: TimezoneDefinition,
    time: string | number | Temporal.Instant,
  ): Temporal.Instant {
    return RuntimeHelper.convertToLocalDate(timezone, time);
  }
}
