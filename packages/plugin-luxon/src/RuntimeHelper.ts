import { DateTime } from "luxon";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | DateTime<boolean>): number {
    return RuntimeHelper.convertToDate(time).toMillis();
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | DateTime<boolean>): DateTime<boolean> {
    switch (typeof time) {
      case "number":
        return DateTime.fromMillis(time);
      case "string":
        return DateTime.fromISO(time);
      case "object":
        if (time instanceof DateTime) {
          return time;
        }
    }
    throw new Error(`Undefined time type (value was '${time as string}')`);
  }
}
