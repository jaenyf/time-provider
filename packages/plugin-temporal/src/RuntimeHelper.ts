import { TimeInputValidator, type TimezoneDefinition } from "@time-provider/core";
import { Temporal } from "@js-temporal/polyfill";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | Temporal.ZonedDateTime): number {
    return RuntimeHelper.convertToUtcDate(time).epochMilliseconds;
  }
  /* @__INLINE__ */
  static convertToUtcDate(time: string | number | Temporal.ZonedDateTime): Temporal.ZonedDateTime {
    TimeInputValidator.assertValid(time);
    if (typeof time === "number")
      return Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO("UTC");
    return Temporal.Instant.from(
      typeof time === "string" ? time : (time as Temporal.ZonedDateTime).toInstant(),
    ).toZonedDateTimeISO("UTC");
  }
  /* @__INLINE__ */
  static convertToLocalDate(
    timezone: TimezoneDefinition,
    time: string | number | Temporal.ZonedDateTime,
  ): Temporal.ZonedDateTime {
    const result = this.convertToUtcDate(time).withTimeZone(timezone);
    if (result === undefined) {
      TimeInputValidator.throwInvalidTimeValue(time);
    }
    return result;
  }
}
