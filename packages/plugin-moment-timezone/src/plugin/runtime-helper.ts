import {
  TimeInputValidator,
  toInstant,
  type EpochMilliseconds,
  type ICalendarScheme,
  type TimezoneDefinition,
} from "@time-provider/core";
import moment from "moment-timezone";
import { MomentTimezoneCalendarScheme } from "./calendar-scheme.ts";

export class RuntimeHelper {
  /**
   * Resolves wall-clock times against moment-timezone's own bundled tzdata rather than the host's
   * ICU - see {@link MomentTimezoneCalendarScheme}. Passing `RuntimeHelper` to itself is safe:
   * static methods are installed on the class before any static field initializer runs, so the
   * converter this adapter captures is already complete.
   */
  static readonly calendarScheme: ICalendarScheme<moment.Moment> = new MomentTimezoneCalendarScheme(
    RuntimeHelper,
  );

  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | moment.Moment): EpochMilliseconds {
    return toInstant({ milliseconds: RuntimeHelper.convertToUtcDate(time).valueOf() });
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
