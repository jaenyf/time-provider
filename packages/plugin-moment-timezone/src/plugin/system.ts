import {
  BaseSystemPlugin,
  BaseSystemRuntime,
  TimeInputValidator,
  type TimezoneDefinition,
} from "@time-provider/core";
import moment from "moment-timezone";
import { RuntimeHelper } from "./runtime-helper.ts";

class SystemRuntime extends BaseSystemRuntime<moment.Moment> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): moment.Moment {
    if (!moment.tz.zone(this.localTimezone)) {
      TimeInputValidator.throwInvalidTimezone(this.localTimezone);
    }
    return moment.utc().tz(this.localTimezone);
  }
  utcNow(): moment.Moment {
    return moment.utc();
  }
}

export class SystemPlugin extends BaseSystemPlugin<moment.Moment> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
