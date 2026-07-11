import { BaseSystemRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { Temporal } from "@js-temporal/polyfill";

export class SystemRuntime extends BaseSystemRuntime<Temporal.Instant> {
  localNow(): Temporal.Instant {
    return Temporal.Now.instant();
  }
  utcNow(): Temporal.Instant {
    return Temporal.Now.zonedDateTimeISO("UTC").toInstant();
  }
  protected convertToTimestampImpl(time: string | number | Temporal.Instant): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | Temporal.Instant): Temporal.Instant {
    return RuntimeHelper.convertToDate(time);
  }
}
