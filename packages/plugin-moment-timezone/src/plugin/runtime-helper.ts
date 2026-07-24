import { TimeInputValidator, type TimezoneDefinition } from "@time-provider/core";
import moment from "moment-timezone";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | moment.Moment): number {
    return RuntimeHelper.convertToUtcDate(time).valueOf();
  }
  /* @__INLINE__ */
  static convertToUtcDate(time: string | number | moment.Moment): moment.Moment {
    TimeInputValidator.assertValid(time);
    const result = typeof time === "string" ? moment(time, moment.ISO_8601, true) : moment(time);
    if (!result.isValid()) {
      TimeInputValidator.throwInvalidTimeValue(time);
    }
    return result;
  }
  /* @__INLINE__ */
  static convertToLocalDate(
    timezone: TimezoneDefinition,
    time: string | number | moment.Moment,
  ): moment.Moment {
    if (!moment.tz.zone(timezone)) {
      TimeInputValidator.throwInvalidTimezone(timezone);
    }
    return this.convertToUtcDate(time).tz(timezone);
  }
}
