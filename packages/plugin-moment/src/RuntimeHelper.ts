import { TimeInputValidator } from "@time-provider/core";
import moment from "moment";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | moment.Moment): number {
    return RuntimeHelper.convertToDate(time).valueOf();
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | moment.Moment): moment.Moment {
    TimeInputValidator.assertValid(time);
    const result = typeof time === "string" ? moment(time, moment.ISO_8601, true) : moment(time);
    if (!result.isValid()) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    return result;
  }
}
