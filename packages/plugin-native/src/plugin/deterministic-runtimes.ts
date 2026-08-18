import {
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
  BaseUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import type { EpochMilliseconds, TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";

class FixedRuntime extends BaseFixedRuntime<Date> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | Date,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<Date> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | Date)[],
  ) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<Date> {
  /*
    All advance* methods in this class mutate and return the same `time` instance rather than cloning it.
    This is safe because they are called with a `Date` freshly produced for that single call.
  */
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | Date,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
  protected advanceYears(time: Date, years: number): Date {
    const day = time.getUTCDate();
    time.setUTCDate(1);
    time.setUTCFullYear(time.getUTCFullYear() + years);
    time.setUTCDate(Math.min(day, RuntimeHelper.daysInMonth(time)));
    return time;
  }
  protected advanceMonths(time: Date, months: number): Date {
    const day = time.getUTCDate();
    time.setUTCDate(1);
    time.setUTCMonth(time.getUTCMonth() + months);
    time.setUTCDate(Math.min(day, RuntimeHelper.daysInMonth(time)));
    return time;
  }
  protected advanceDays(time: Date, days: number): Date {
    time.setUTCDate(time.getUTCDate() + days);
    return time;
  }
  protected advanceHours(time: Date, hours: number): Date {
    time.setUTCHours(time.getUTCHours() + hours);
    return time;
  }
  protected advanceMinutes(time: Date, minutes: number): Date {
    time.setUTCMinutes(time.getUTCMinutes() + minutes);
    return time;
  }
  protected advanceSeconds(time: Date, seconds: number): Date {
    time.setUTCSeconds(time.getUTCSeconds() + seconds);
    return time;
  }
  protected advanceMilliseconds(time: Date, milliseconds: number): Date {
    time.setUTCMilliseconds(time.getUTCMilliseconds() + milliseconds);
    return time;
  }
}

export class DeterministicPlugin extends BaseUtcOnlyDeterministicPlugin<Date> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
