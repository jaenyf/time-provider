import { DateTime } from "luxon";
import { BaseTimeAdapter } from "@time-provider/core";

export class TimeAdapter extends BaseTimeAdapter<DateTime> {
  localNow(): DateTime {
    return DateTime.now();
  }
  utcNow(): DateTime {
    return DateTime.utc();
  }
  protected convertToDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
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
