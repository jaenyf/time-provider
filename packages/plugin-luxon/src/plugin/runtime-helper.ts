import { TimeInputValidator, type TimezoneDefinition } from "@time-provider/core";
import { DateTime } from "luxon";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | DateTime<boolean>): number {
    return RuntimeHelper.convertToUtcDate(time).toMillis();
  }
  /* @__INLINE__ */
  static convertToUtcDate(time: string | number | DateTime<boolean>): DateTime<boolean> {
    TimeInputValidator.assertValid(time);
    let returnTime: DateTime<boolean> | undefined = undefined;
    switch (typeof time) {
      case "number":
        returnTime = DateTime.fromMillis(time);
        break;
      case "string":
        returnTime = DateTime.fromISO(time, { zone: "UTC" });
        break;
      case "object":
        if (time instanceof DateTime) {
          returnTime = time;
        }
        break;
    }
    if (undefined === returnTime || !returnTime.isValid) {
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
      TimeInputValidator.throwInvalidTimeValue(time);
    }
    return result;
  }
}
