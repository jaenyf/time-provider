import { BaseSequentialRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class SequentialRuntime extends BaseSequentialRuntime<Date> {
  protected convertToEpochTimestampImpl(time: string | number | Date): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | Date): Date {
    return RuntimeHelper.convertToDate(time);
  }
}
