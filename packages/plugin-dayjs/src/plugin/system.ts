import { BaseSystemPlugin, BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";
import dayjs from "dayjs";

class SystemRuntime extends BaseSystemRuntime<dayjs.Dayjs> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): dayjs.Dayjs {
    return dayjs().utc().tz(this.localTimezone);
  }
  utcNow(): dayjs.Dayjs {
    return dayjs.utc();
  }
}

export class SystemPlugin extends BaseSystemPlugin<dayjs.Dayjs> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
