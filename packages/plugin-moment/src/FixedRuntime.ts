import { BaseFixedRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import moment from "moment";

export class FixedRuntime extends BaseFixedRuntime<moment.Moment> {
  protected convertToTimestampImpl(time: string | number | moment.Moment): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | moment.Moment): moment.Moment {
    return RuntimeHelper.convertToDate(time);
  }
}
