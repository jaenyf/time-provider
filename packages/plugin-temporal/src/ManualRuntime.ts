import { BaseManualRuntime } from "@time-provider/core";

import { RuntimeHelper } from "./RuntimeHelper.ts";
import type { Temporal } from "@js-temporal/polyfill";

export class ManualRuntime extends BaseManualRuntime<Temporal.Instant> {
  protected advanceYears(time: Temporal.Instant, years: number): Temporal.Instant {
    return this.toZoned(time).add({ years }).toInstant();
  }
  protected advanceMonths(time: Temporal.Instant, months: number): Temporal.Instant {
    return this.toZoned(time).add({ months }).toInstant();
  }
  protected advanceDays(time: Temporal.Instant, days: number): Temporal.Instant {
    return this.toZoned(time).add({ days }).toInstant();
  }
  protected advanceHours(time: Temporal.Instant, hours: number): Temporal.Instant {
    return time.add({ hours });
  }
  protected advanceMinutes(time: Temporal.Instant, minutes: number): Temporal.Instant {
    return time.add({ minutes });
  }
  protected advanceSeconds(time: Temporal.Instant, seconds: number): Temporal.Instant {
    return time.add({ seconds });
  }
  protected advanceMilliseconds(time: Temporal.Instant, milliseconds: number): Temporal.Instant {
    return time.add({ milliseconds });
  }
  private toZoned(time: Temporal.Instant): Temporal.ZonedDateTime {
    return time.toZonedDateTimeISO("UTC");
  }
  protected convertToEpochTimestampImpl(time: string | number | Temporal.Instant): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | Temporal.Instant): Temporal.Instant {
    return RuntimeHelper.convertToDate(time);
  }
}
