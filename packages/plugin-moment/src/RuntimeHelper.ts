import moment from "moment";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | moment.Moment): number {
    return moment(time).valueOf();
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | moment.Moment): moment.Moment {
    return moment(time);
  }
}
