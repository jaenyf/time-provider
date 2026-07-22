import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";

export class TimeInputValidator {
  /**
   * Guards against invalid values.
   */
  /* @__INLINE__ */
  static assertValid<TDate>(
    time: string | number | TDate,
  ): asserts time is string | number | TDate {
    if (
      time === undefined ||
      time === null ||
      (typeof time === "number" && Number.isNaN(time)) ||
      (typeof time === "string" && time.trim() === "")
    ) {
      this.throwInvalidTimeValue(time);
    }
  }

  /* @__INLINE__ */
  static throwInvalidTimeValue<TDate>(time: string | number | TDate): never {
    throw new Error(`Invalid time value (value was '${String(time)}')`);
  }

  /* @__INLINE__ */
  static throwInvalidTimezone(timezone: TimezoneDefinition): never {
    throw new Error(`Invalid timezone value (value was '${String(timezone)}')`);
  }
}
