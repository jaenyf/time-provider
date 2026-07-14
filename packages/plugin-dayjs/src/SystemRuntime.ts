import { BaseSystemRuntime } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/plugin/utc.js";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class SystemRuntime extends BaseSystemRuntime<Dayjs> {
  localNow(): dayjs.Dayjs {
    return dayjs();
  }
  utcNow(): dayjs.Dayjs {
    return dayjs.utc();
  }
  protected convertToTimestampImpl(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToTimestamp(time);
  }

  protected convertToDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return RuntimeHelper.convertToDate(time);
  }
}
