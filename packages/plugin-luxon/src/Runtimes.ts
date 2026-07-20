import {
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
  BaseSystemRuntime,
  type TimezoneDefinition,
} from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import { DateTime } from "luxon";

export class FixedRuntime extends BaseFixedRuntime<DateTime<boolean>> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | DateTime<boolean>) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

export class SequentialRuntime extends BaseSequentialRuntime<DateTime<boolean>> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | DateTime<boolean>)[],
  ) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

export class SystemRuntime extends BaseSystemRuntime<DateTime<boolean>> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): DateTime<boolean> {
    return DateTime.utc().setZone(this.localTimezone);
  }
  utcNow(): DateTime<boolean> {
    return DateTime.utc();
  }
}

export class ManualRuntime extends BaseManualRuntime<DateTime<boolean>> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | DateTime<boolean>) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
  protected advanceYears(time: DateTime<boolean>, years: number): DateTime<boolean> {
    return time.plus({ years });
  }
  protected advanceMonths(time: DateTime<boolean>, months: number): DateTime<boolean> {
    return time.plus({ months });
  }
  protected advanceDays(time: DateTime<boolean>, days: number): DateTime<boolean> {
    return time.plus({ days });
  }
  protected advanceHours(time: DateTime<boolean>, hours: number): DateTime<boolean> {
    return time.plus({ hours });
  }
  protected advanceMinutes(time: DateTime<boolean>, minutes: number): DateTime<boolean> {
    return time.plus({ minutes });
  }
  protected advanceSeconds(time: DateTime<boolean>, seconds: number): DateTime<boolean> {
    return time.plus({ seconds });
  }
  protected advanceMilliseconds(time: DateTime<boolean>, milliseconds: number): DateTime<boolean> {
    return time.plus({ milliseconds });
  }
}
