import {
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
  BaseSystemRuntime,
  type TimezoneDefinition,
} from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class FixedRuntime extends BaseFixedRuntime<Temporal.ZonedDateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | number | Temporal.ZonedDateTime,
  ) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

export class SequentialRuntime extends BaseSequentialRuntime<Temporal.ZonedDateTime> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | Temporal.ZonedDateTime)[],
  ) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

export class SystemRuntime extends BaseSystemRuntime<Temporal.ZonedDateTime> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): Temporal.ZonedDateTime {
    return RuntimeHelper.convertToLocalDate(this.localTimezone, this.utcNow());
  }
  utcNow(): Temporal.ZonedDateTime {
    return Temporal.Now.zonedDateTimeISO("UTC");
  }
}

export class ManualRuntime extends BaseManualRuntime<Temporal.ZonedDateTime> {
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
