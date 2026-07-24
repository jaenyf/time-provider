import {
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
  BaseUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import type { TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";

class FixedRuntime extends BaseFixedRuntime<Date> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | Date) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<Date> {
  constructor(localTimezone: TimezoneDefinition, sequentialTimes: (string | number | Date)[]) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<Date> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | Date) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
  protected advanceYears(time: Date, years: number): Date {
    time.setFullYear(time.getFullYear() + years);
    return time;
  }
  protected advanceMonths(time: Date, months: number): Date {
    time.setMonth(time.getMonth() + months);
    return time;
  }
  protected advanceDays(time: Date, days: number): Date {
    time.setDate(time.getDate() + days);
    return time;
  }
  protected advanceHours(time: Date, hours: number): Date {
    time.setHours(time.getHours() + hours);
    return time;
  }
  protected advanceMinutes(time: Date, minutes: number): Date {
    time.setMinutes(time.getMinutes() + minutes);
    return time;
  }
  protected advanceSeconds(time: Date, seconds: number): Date {
    time.setSeconds(time.getSeconds() + seconds);
    return time;
  }
  protected advanceMilliseconds(time: Date, milliseconds: number): Date {
    time.setMilliseconds(time.getMilliseconds() + milliseconds);
    return time;
  }
}

export class DeterministicPlugin extends BaseUtcOnlyDeterministicPlugin<Date> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
