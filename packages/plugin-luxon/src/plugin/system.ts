import {
  BaseSystemPlugin,
  BaseSystemRuntime,
  TimeInputValidator,
  toInstant,
  type EpochMilliseconds,
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
  timestampNow(): EpochMilliseconds {
    return toInstant({ milliseconds: DateTime.utc().toMillis() });
  }
}

export class SystemPlugin extends BaseSystemPlugin<DateTime> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
