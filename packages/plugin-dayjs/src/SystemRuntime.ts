import { BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import dayjs from "dayjs";

export class SystemRuntime extends BaseSystemRuntime<dayjs.Dayjs> {
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
