import { BaseSequentialRuntime } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class SequentialRuntime extends BaseSequentialRuntime<Dayjs> {
  protected convertToTimestampImpl(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return RuntimeHelper.convertToDate(time);
  }
}
