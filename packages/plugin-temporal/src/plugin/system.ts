import { BaseSystemPlugin, BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";

class SystemRuntime extends BaseSystemRuntime<Temporal.ZonedDateTime> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): Temporal.ZonedDateTime {
    return RuntimeHelper.convertToLocalDate(this.localTimezone, this.utcNow());
  }
  utcNow(): Temporal.ZonedDateTime {
    return Temporal.Now.zonedDateTimeISO("UTC");
  }
}

export class SystemPlugin extends BaseSystemPlugin<Temporal.ZonedDateTime> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
