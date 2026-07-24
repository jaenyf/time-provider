import {
  BaseSystemRuntime,
  BaseUtcOnlySystemPlugin,
  type TimezoneDefinition,
} from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";

class SystemRuntime extends BaseSystemRuntime<Date> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): Date {
    return RuntimeHelper.convertToLocalDate(this.localTimezone, this.utcNow());
  }
  utcNow(): Date {
    return new Date();
  }
}

export class SystemPlugin extends BaseUtcOnlySystemPlugin<Date> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
