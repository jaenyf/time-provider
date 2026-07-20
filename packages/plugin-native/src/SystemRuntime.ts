import { BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class SystemRuntime extends BaseSystemRuntime<Date> {
  localNow(timezone?: TimezoneDefinition): Date {
    return RuntimeHelper.convertToLocalDate(
      timezone ? timezone : this.localTimezone,
      this.utcNow(),
    );
  }
  utcNow(): Date {
    return new Date();
  }
  protected convertToEpochTimestampImpl(time: string | number | Date): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToUtcDateImpl(time: string | number | Date): Date {
    return RuntimeHelper.convertToUtcDate(time);
  }
  protected convertToLocalDateImpl(
    timezone: TimezoneDefinition,
    time: string | number | Date,
  ): Date {
    return RuntimeHelper.convertToLocalDate(timezone, time);
  }
}
