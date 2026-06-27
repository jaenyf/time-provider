import { DateTime } from "luxon";
import { type Adapter } from "@time-provider/core";

export class TimeAdapter implements Adapter<DateTime> {
  localNow(): DateTime {
    return DateTime.now();
  }
  utcNow(): DateTime {
    return DateTime.utc();
  }
  parse(referenceDate: string | number | DateTime): DateTime {
    switch (typeof referenceDate) {
      case "number":
        return DateTime.fromMillis(referenceDate);
      case "string":
        return DateTime.fromISO(referenceDate);
      case "object":
        if (referenceDate instanceof DateTime) {
          return referenceDate;
        }
    }
    throw new Error("Undefined referenceDate type");
  }
}
