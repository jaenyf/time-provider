import {
  BaseDeterministicPlugin,
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
} from "@time-provider/core/deterministic";
import type { EpochMilliseconds, IMoveOptions, TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";
import dayjs from "dayjs";

class FixedRuntime extends BaseFixedRuntime<dayjs.Dayjs> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | dayjs.Dayjs,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<dayjs.Dayjs> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialMoves: {
      time: string | EpochMilliseconds | number | dayjs.Dayjs;
      as?: IMoveOptions["as"];
    }[],
  ) {
    super(localTimezone, sequentialMoves, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<dayjs.Dayjs> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | dayjs.Dayjs,
    moveUntilTimersLimit: number,
  ) {
    super(localTimezone, fixedTime, moveUntilTimersLimit, RuntimeHelper);
  }
  protected advanceYears(time: dayjs.Dayjs, years: number): dayjs.Dayjs {
    return time.add(years, "year");
  }
  protected advanceMonths(time: dayjs.Dayjs, months: number): dayjs.Dayjs {
    return time.add(months, "month");
  }
}

export class DeterministicPlugin extends BaseDeterministicPlugin<dayjs.Dayjs> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
