import {
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
  BaseSystemRuntime,
  type TimezoneDefinition,
} from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import moment from "moment";

export class FixedRuntime extends BaseFixedRuntime<moment.Moment> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | moment.Moment) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

export class SequentialRuntime extends BaseSequentialRuntime<moment.Moment> {
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | moment.Moment)[],
  ) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

export class SystemRuntime extends BaseSystemRuntime<moment.Moment> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): moment.Moment {
    return RuntimeHelper.convertToLocalDate(this.localTimezone, this.utcNow());
  }
  utcNow(): moment.Moment {
    return moment.utc();
  }
}

export class ManualRuntime extends BaseManualRuntime<moment.Moment> {
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
