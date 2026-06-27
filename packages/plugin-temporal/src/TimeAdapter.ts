import { type Adapter } from "@time-provider/core";
import { Temporal } from "@js-temporal/polyfill";

export class TimeAdapter implements Adapter<Temporal.Instant> {
  localNow(): Temporal.Instant {
    return Temporal.Now.instant();
  }
  utcNow(): Temporal.Instant {
    return Temporal.Now.zonedDateTimeISO("UTC").toInstant();
  }
  parse(initialValue: string | number | Temporal.Instant): Temporal.Instant {
    if (typeof initialValue === "number")
      return Temporal.Instant.fromEpochMilliseconds(initialValue);
    return Temporal.Instant.from(initialValue);
  }
}
