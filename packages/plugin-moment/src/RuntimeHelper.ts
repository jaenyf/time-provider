import moment from "moment";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | moment.Moment): number {
    return RuntimeHelper.convertToDate(time).valueOf();
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | moment.Moment): moment.Moment {
    if (time === undefined || time === null || (typeof time === "number" && Number.isNaN(time))) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    const result = typeof time === "string" ? moment(time, moment.ISO_8601, true) : moment(time);
    if (!result.isValid()) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    return result;
  }
}
