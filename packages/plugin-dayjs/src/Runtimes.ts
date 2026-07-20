import {
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
  BaseSystemRuntime,
  type TimezoneDefinition,
} from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import dayjs, { Dayjs } from "dayjs";

export class FixedRuntime extends BaseFixedRuntime<dayjs.Dayjs> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | dayjs.Dayjs) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

export class SequentialRuntime extends BaseSequentialRuntime<Dayjs> {
  constructor(localTimezone: TimezoneDefinition, sequentialTimes: (string | number | Dayjs)[]) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

export class SystemRuntime extends BaseSystemRuntime<Dayjs> {
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

export class ManualRuntime extends BaseManualRuntime<dayjs.Dayjs> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | dayjs.Dayjs) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
  protected advanceYears(time: dayjs.Dayjs, years: number): dayjs.Dayjs {
    return time.add(years, "year");
  }
  protected advanceMonths(time: dayjs.Dayjs, months: number): dayjs.Dayjs {
    return time.add(months, "month");
  }
  protected advanceDays(time: dayjs.Dayjs, days: number): dayjs.Dayjs {
    return time.add(days, "day");
  }
  protected advanceHours(time: dayjs.Dayjs, hours: number): dayjs.Dayjs {
    return time.add(hours, "hour");
  }
  protected advanceMinutes(time: dayjs.Dayjs, minutes: number): dayjs.Dayjs {
    return time.add(minutes, "minute");
  }
  protected advanceSeconds(time: dayjs.Dayjs, seconds: number): dayjs.Dayjs {
    return time.add(seconds, "second");
  }
  protected advanceMilliseconds(time: dayjs.Dayjs, milliseconds: number): dayjs.Dayjs {
    return time.add(milliseconds, "millisecond");
  }
}
