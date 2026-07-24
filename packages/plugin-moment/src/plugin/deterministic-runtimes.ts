import {
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
  BaseUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import type { TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";

class FixedRuntime extends BaseFixedRuntime<moment.Moment> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | moment.Moment) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<moment.Moment> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | moment.Moment)[],
  ) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<moment.Moment> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | moment.Moment) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
  protected advanceYears(time: moment.Moment, years: number): moment.Moment {
    return time.add({ years });
  }
  protected advanceMonths(time: moment.Moment, months: number): moment.Moment {
    return time.add({ months });
  }
  protected advanceDays(time: moment.Moment, days: number): moment.Moment {
    return time.add({ days });
  }
  protected advanceHours(time: moment.Moment, hours: number): moment.Moment {
    return time.add({ hours });
  }
  protected advanceMinutes(time: moment.Moment, minutes: number): moment.Moment {
    return time.add({ minutes }).clone();
  }
  protected advanceSeconds(time: moment.Moment, seconds: number): moment.Moment {
    return time.add({ seconds });
  }
  protected advanceMilliseconds(time: moment.Moment, milliseconds: number): moment.Moment {
    return time.add({ milliseconds });
  }
}

export class DeterministicPlugin extends BaseUtcOnlyDeterministicPlugin<moment.Moment> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
