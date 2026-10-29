import {
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
  BaseUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import type { EpochMilliseconds, IMoveOptions, TimezoneDefinition } from "@time-provider/core";
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
    sequentialMoves: {
      time: string | EpochMilliseconds | number | Date;
      as?: IMoveOptions["as"];
    }[],
  ) {
    super(localTimezone, sequentialMoves, RuntimeHelper);
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
    moveUntilTimersLimit: number,
  ) {
    super(localTimezone, fixedTime, moveUntilTimersLimit, RuntimeHelper);
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
}

export class DeterministicPlugin extends BaseUtcOnlyDeterministicPlugin<Date> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
