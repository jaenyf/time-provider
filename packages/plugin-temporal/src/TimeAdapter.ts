import { BaseTimeAdapter } from "@time-provider/core";
import { Temporal } from "@js-temporal/polyfill";

export class TimeAdapter extends BaseTimeAdapter<Temporal.Instant> {
  localNow(): Temporal.Instant {
    return Temporal.Now.instant();
  }
  utcNow(): Temporal.Instant {
    return Temporal.Now.zonedDateTimeISO("UTC").toInstant();
  }

  protected convertToDateImpl(time: string | number | Temporal.Instant): Temporal.Instant {
    if (typeof time === "number") return Temporal.Instant.fromEpochMilliseconds(time);
    return Temporal.Instant.from(time);
  }
}
