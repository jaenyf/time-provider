import {
  TimeInputValidator,
  toInstant,
  type EpochMilliseconds,
  type TimezoneDefinition,
} from "@time-provider/core";
import { DateTime } from "luxon";

function convertDateTimeObject(time: DateTime<boolean>): DateTime<boolean> | undefined {
  // `isDateTime` also accepts a DateTime from another copy of luxon.
  return time instanceof DateTime || DateTime.isDateTime?.(time) ? time : undefined;
}

export class RuntimeHelper {
  private static convertToDateTime(
    time: string | number | DateTime<boolean>,
  ): DateTime<boolean> | undefined {
    switch (typeof time) {
      case "number":
        return DateTime.fromMillis(time);
      case "string":
        return DateTime.fromISO(time, { zone: "UTC" });
      case "object":
        return convertDateTimeObject(time);
    }
  }
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | DateTime<boolean>): EpochMilliseconds {
    return toInstant({ milliseconds: RuntimeHelper.convertToUtcDate(time).toMillis() });
  }
  /* @__INLINE__ */
  static convertToUtcDate(time: string | number | DateTime<boolean>): DateTime<boolean> {
    TimeInputValidator.assertValid(time);

    const returnTime = RuntimeHelper.convertToDateTime(time);

    if (returnTime === undefined || !returnTime.isValid) {
      TimeInputValidator.throwInvalidTimeValue(time);
    }

    return returnTime;
  }
  /* @__INLINE__ */
  static convertToLocalDate(
    timezone: TimezoneDefinition,
    time: string | number | DateTime<boolean>,
  ): DateTime<boolean> {
    const result = this.convertToUtcDate(time).setZone(timezone);
    if (!result.isValid) {
      TimeInputValidator.throwInvalidTimezone(timezone);
    }
    return result;
  }
}
