import dayjs from "dayjs";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToDate(time).valueOf();
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    if (time === undefined || time === null || (typeof time === "number" && Number.isNaN(time))) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    const result = dayjs(time);
    if (!result.isValid()) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    return result;
  }
}
