import { TimeInputValidator, type TimezoneDefinition } from "@time-provider/core";
import dayjs from "dayjs";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToUtcDate(time).valueOf();
  }
  /* @__INLINE__ */
  static convertToUtcDate(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
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
    time: string | number | dayjs.Dayjs,
  ): dayjs.Dayjs {
    return this.convertToUtcDate(time).tz(timezone);
  }
}
