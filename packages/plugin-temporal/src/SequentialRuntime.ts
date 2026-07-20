import { BaseSequentialRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import type { Temporal } from "@js-temporal/polyfill";

export class SequentialRuntime extends BaseSequentialRuntime<Temporal.ZonedDateTime> {
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
