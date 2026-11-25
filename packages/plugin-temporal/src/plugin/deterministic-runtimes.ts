import {
  BaseDeterministicPlugin,
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
} from "@time-provider/core/deterministic";
import type { EpochMilliseconds, IMoveOptions, TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";

class FixedRuntime extends BaseFixedRuntime<Temporal.ZonedDateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | Temporal.ZonedDateTime,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<Temporal.ZonedDateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialMoves: {
      time: string | EpochMilliseconds | number | Temporal.ZonedDateTime;
      as?: IMoveOptions["as"];
    }[],
    timePausedFromDepth?: number,
  ) {
    super(localTimezone, sequentialMoves, RuntimeHelper, timePausedFromDepth);
  }
}

class ManualRuntime extends BaseManualRuntime<Temporal.ZonedDateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | Temporal.ZonedDateTime,
    moveUntilTimersLimit: number,
  ) {
    super(localTimezone, fixedTime, moveUntilTimersLimit, RuntimeHelper);
  }
  protected advanceYears(time: Temporal.ZonedDateTime, years: number): Temporal.ZonedDateTime {
    return time.add({ years });
  }
  protected advanceMonths(time: Temporal.ZonedDateTime, months: number): Temporal.ZonedDateTime {
    return time.add({ months });
  }
}

export class DeterministicPlugin extends BaseDeterministicPlugin<Temporal.ZonedDateTime> {
  protected readonly ManualRuntimeCtor: typeof ManualRuntime = ManualRuntime;
  protected readonly FixedRuntimeCtor: typeof FixedRuntime = FixedRuntime;
  protected readonly SequentialRuntimeCtor: typeof SequentialRuntime = SequentialRuntime;
}
