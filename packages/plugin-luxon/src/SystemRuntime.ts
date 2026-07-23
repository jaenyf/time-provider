import {
  BaseSystemRuntime,
  TimeInputValidator,
  type TimezoneDefinition,
} from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { DateTime } from "luxon";

export class SystemRuntime extends BaseSystemRuntime<DateTime> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): DateTime<boolean> {
    const now = DateTime.utc().setZone(this.localTimezone);
    if (!now.isValid) {
      TimeInputValidator.throwInvalidTimezone(this.localTimezone);
    }
    return now;
  }
  utcNow(): DateTime<boolean> {
    return DateTime.utc();
  }
}
