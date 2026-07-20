import { BaseSystemRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import moment from "moment";

export class SystemRuntime extends BaseSystemRuntime<moment.Moment> {
  localNow(): moment.Moment {
    return moment();
  }
  utcNow(): moment.Moment {
    return moment.utc();
  }
  protected convertToEpochTimestampImpl(time: string | number | moment.Moment): number {
    return RuntimeHelper.convertToTimestamp(time);
  }

  protected convertToUtcDateImpl(time: string | number | moment.Moment): moment.Moment {
    return RuntimeHelper.convertToDate(time);
  }
}
