import {
  BaseDeterministicPlugin,
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
} from "@time-provider/core/deterministic";
import type { TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";
import { DateTime } from "luxon";

class FixedRuntime extends BaseFixedRuntime<DateTime> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | DateTime) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<DateTime> {
  constructor(localTimezone: TimezoneDefinition, sequentialTimes: (string | number | DateTime)[]) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<DateTime> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | DateTime) {
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

export class DeterministicPlugin extends BaseDeterministicPlugin<DateTime> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
