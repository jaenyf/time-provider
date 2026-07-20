import { TimeInputValidator, type TimezoneDefinition } from "@time-provider/core";
import { Temporal } from "@js-temporal/polyfill";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | Temporal.Instant): number {
    return RuntimeHelper.convertToUtcDate(time).epochMilliseconds;
  }
  /* @__INLINE__ */
  static convertToUtcDate(time: string | number | Temporal.Instant): Temporal.Instant {
    TimeInputValidator.assertValid(time);
    if (typeof time === "number") return Temporal.Instant.fromEpochMilliseconds(time);
    return Temporal.Instant.from(time);
  }
  /* @__INLINE__ */
  static convertToLocalDate(
    timezone: TimezoneDefinition,
    time: string | number | Temporal.Instant,
  ): Temporal.Instant {
    const result = this.convertToUtcDate(time).toZonedDateTimeISO(timezone);
    if (result === undefined) {
      TimeInputValidator.throwInvalidTimeValue(time);
    }
    return result.toInstant();
  }
}
