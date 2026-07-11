import { BaseFixedRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class FixedRuntime extends BaseFixedRuntime<Date> {
  protected convertToTimestampImpl(time: string | number | Date): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | Date): Date {
    return RuntimeHelper.convertToDate(time);
  }
}
