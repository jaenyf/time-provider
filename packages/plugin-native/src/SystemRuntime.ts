import { BaseSystemRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class SystemRuntime extends BaseSystemRuntime<Date> {
  localNow = () => new Date();
  utcNow = () => new Date();
  protected convertToTimestampImpl(time: string | number | Date): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | Date): Date {
    return RuntimeHelper.convertToDate(time);
  }
}
