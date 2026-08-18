import {
  TimeInputValidator,
  toInstant,
  type EpochMilliseconds,
  type TimezoneDefinition,
} from "@time-provider/core";
import dayjs from "dayjs";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | EpochMilliseconds | dayjs.Dayjs): EpochMilliseconds {
    return toInstant({ milliseconds: RuntimeHelper.convertToUtcDate(time).valueOf() });
  }
  /* @__INLINE__ */
  static convertToUtcDate(time: string | EpochMilliseconds | dayjs.Dayjs): dayjs.Dayjs {
    TimeInputValidator.assertValid(time);
    const result = dayjs(time);
    if (!result.isValid()) {
      TimeInputValidator.throwInvalidTimeValue(time);
    }
    return result;
  }
  /* @__INLINE__ */
  static convertToLocalDate(
    timezone: TimezoneDefinition,
    time: string | EpochMilliseconds | dayjs.Dayjs,
  ): dayjs.Dayjs {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      TimeInputValidator.throwInvalidTimezone(timezone);
    }
    return this.convertToUtcDate(time).tz(timezone);
  }
}
