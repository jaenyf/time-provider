import {
  BaseDeterministicPlugin,
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
} from "@time-provider/core/deterministic";
import type { EpochMilliseconds, IMoveOptions, TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";
import moment from "moment-timezone";

class FixedRuntime extends BaseFixedRuntime<moment.Moment> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | moment.Moment,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<moment.Moment> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialMoves: {
      time: string | EpochMilliseconds | number | moment.Moment;
      as?: IMoveOptions["as"];
    }[],
  ) {
    super(localTimezone, sequentialMoves, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<moment.Moment> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | moment.Moment,
    moveUntilTimersLimit: number,
  ) {
    super(localTimezone, fixedTime, moveUntilTimersLimit, RuntimeHelper);
  }
  protected advanceYears(time: moment.Moment, years: number): moment.Moment {
    return time.add({ years });
  }
  protected advanceMonths(time: moment.Moment, months: number): moment.Moment {
    return time.add({ months });
  }
}

export class DeterministicPlugin extends BaseDeterministicPlugin<moment.Moment> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
