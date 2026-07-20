import { BaseManualRuntime, type TimezoneDefinition } from "@time-provider/core";

import { RuntimeHelper } from "./RuntimeHelper.ts";
import type { Temporal } from "@js-temporal/polyfill";

export class ManualRuntime extends BaseManualRuntime<Temporal.ZonedDateTime> {
  protected advanceYears(time: Temporal.ZonedDateTime, years: number): Temporal.ZonedDateTime {
    return time.add({ years });
  }
  protected advanceMonths(time: Temporal.ZonedDateTime, months: number): Temporal.ZonedDateTime {
    return time.add({ months });
  }
  protected advanceDays(time: Temporal.ZonedDateTime, days: number): Temporal.ZonedDateTime {
    return time.add({ days });
  }
  protected advanceHours(time: Temporal.ZonedDateTime, hours: number): Temporal.ZonedDateTime {
    return time.add({ hours });
  }
  protected advanceMinutes(time: Temporal.ZonedDateTime, minutes: number): Temporal.ZonedDateTime {
    return time.add({ minutes });
  }
  protected advanceSeconds(time: Temporal.ZonedDateTime, seconds: number): Temporal.ZonedDateTime {
    return time.add({ seconds });
  }
  protected advanceMilliseconds(
    time: Temporal.ZonedDateTime,
    milliseconds: number,
  ): Temporal.ZonedDateTime {
    return time.add({ milliseconds });
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
