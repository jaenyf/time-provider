import { DateTime } from "luxon";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | DateTime<boolean>): number {
    return RuntimeHelper.convertToDate(time).toMillis();
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | DateTime<boolean>): DateTime<boolean> {
    if (time === undefined || time === null) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    let returnTime: DateTime<boolean> | undefined = undefined;
    switch (typeof time) {
      case "number":
        if (Number.isNaN(time)) {
          throw new Error(`Invalid time value (value was '${String(time)}')`);
        }
        returnTime = DateTime.fromMillis(time);
        break;
      case "string":
        returnTime = DateTime.fromISO(time);
        break;
      case "object":
        if (time instanceof DateTime) {
          returnTime = time;
        }
        break;
    }
    if (undefined === returnTime || !returnTime.isValid) {
      throw new Error(`Invalid time value (value was '${time as string}')`);
    }
    return returnTime;
  }
}
