import {
  BaseDeterministicPlugin,
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
} from "@time-provider/core/deterministic";
import type { EpochMilliseconds, IMoveOptions, TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";
import { DateTime } from "luxon";

class FixedRuntime extends BaseFixedRuntime<DateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | DateTime,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<DateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialMoves: {
      time: string | EpochMilliseconds | number | DateTime;
      as?: IMoveOptions["as"];
    }[],
  ) {
    super(localTimezone, sequentialMoves, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<DateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | DateTime,
    moveUntilTimersLimit: number,
  ) {
    super(localTimezone, fixedTime, moveUntilTimersLimit, RuntimeHelper);
  }
  protected advanceYears(time: DateTime<boolean>, years: number): DateTime<boolean> {
    return time.plus({ years });
  }
  protected advanceMonths(time: DateTime<boolean>, months: number): DateTime<boolean> {
    return time.plus({ months });
  }
}

export class DeterministicPlugin extends BaseDeterministicPlugin<DateTime> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
