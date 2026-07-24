import {
  BaseDeterministicPlugin,
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
} from "@time-provider/core/deterministic";
import type { TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";

class FixedRuntime extends BaseFixedRuntime<Temporal.ZonedDateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | number | Temporal.ZonedDateTime,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<Temporal.ZonedDateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | Temporal.ZonedDateTime)[],
  ) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<Temporal.ZonedDateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | number | Temporal.ZonedDateTime,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
  protected advanceYears(time: Temporal.ZonedDateTime, years: number): Temporal.ZonedDateTime {
    return time.add({ years });
  }
  protected advanceMonths(time: Temporal.ZonedDateTime, months: number): Temporal.ZonedDateTime {
    return time.add({ months });
  }
  protected advanceDays(time: Temporal.ZonedDateTime, days: number): Temporal.ZonedDateTime {
    return time.add({ days });
  }
  protected advanceHours(time: Temporal.ZonedDateTime, hours: number): Temporal.ZonedDateTime {
    return time.add({ hours });
  }
  protected advanceMinutes(time: Temporal.ZonedDateTime, minutes: number): Temporal.ZonedDateTime {
    return time.add({ minutes });
  }
  protected advanceSeconds(time: Temporal.ZonedDateTime, seconds: number): Temporal.ZonedDateTime {
    return time.add({ seconds });
  }
  protected advanceMilliseconds(
    time: Temporal.ZonedDateTime,
    milliseconds: number,
  ): Temporal.ZonedDateTime {
    return time.add({ milliseconds });
  }
}

export class DeterministicPlugin extends BaseDeterministicPlugin<Temporal.ZonedDateTime> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
