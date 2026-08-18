import {
  BaseSystemRuntime,
  BaseUtcOnlySystemPlugin,
  toInstant,
  type EpochMilliseconds,
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
  timestampNow(): EpochMilliseconds {
    return toInstant({ milliseconds: Date.now() });
  }
}

export class SystemPlugin extends BaseUtcOnlySystemPlugin<Date> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
