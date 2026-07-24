import {
  BaseSystemPlugin,
  BaseSystemRuntime,
  TimeInputValidator,
  type TimezoneDefinition,
} from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";
import { DateTime } from "luxon";

class SystemRuntime extends BaseSystemRuntime<DateTime> {
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

export class SystemPlugin extends BaseSystemPlugin<DateTime> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
