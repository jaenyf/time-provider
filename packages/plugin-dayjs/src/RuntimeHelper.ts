import { TimeInputValidator } from "@time-provider/core";
import dayjs from "dayjs";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToDate(time).valueOf();
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    TimeInputValidator.assertValid(time);
    const result = dayjs(time);
    if (!result.isValid()) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    return result;
  }
}
