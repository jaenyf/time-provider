import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";

/**
 * Handles the time conversions for a Runtime. This is only used for Plugins.
 */
export interface ITimeConverter<TDate> {
  convertToTimestamp(time: string | number | TDate): number;
  convertToUtcDate(time: string | number | TDate): TDate;
  convertToLocalDate(timezone: TimezoneDefinition, time: string | number | TDate): TDate;
}
