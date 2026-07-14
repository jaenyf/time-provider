import dayjs from "dayjs";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | dayjs.Dayjs): number {
    return dayjs(time).valueOf();
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return dayjs(time);
  }
}
