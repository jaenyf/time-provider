import { BaseManualRuntime } from "@time-provider/core";

import { RuntimeHelper } from "./RuntimeHelper.ts";
import moment from "moment";

export class ManualRuntime extends BaseManualRuntime<moment.Moment> {
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
  protected convertToTimestampImpl(time: string | number | moment.Moment): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | moment.Moment): moment.Moment {
    return RuntimeHelper.convertToDate(time);
  }
}
