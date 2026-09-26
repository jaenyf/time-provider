import type { IScheduledHandle } from "@time-provider/core";
import type { DayOfWeekName, ICronSpec, MonthName } from "./cron-parser.ts";

/** Adds `scheduler.cron` to a composed Time-Provider. */
export type WithCronApi<
  TDate,
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
> = {
  scheduler: {
    /** Cron scheduling API using the runtime's local timezone. */
    cron: ICronApi<TDate, TMonthName, TWeekdayName>;
  };
};

/** Cron scheduling API exposed by the addon. */
export interface ICronApi<
  // Kept generic over TDate for symmetry with WithCronApi<TDate> and the rest of the *Api<TDate>
  // family, even though no member here happens to reference it.
  // oxlint-disable-next-line no-unused-vars
  TDate,
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
> {
  /**
   * Schedules `callback` from a cron expression.
   * @param expression A 5-field cron expression.
   * @throws If `expression` is malformed.
   */
  schedule(expression: string, callback: () => void): IScheduledHandle;

  /**
   * Schedules `callback` from a JSON cron spec.
   * @param spec The cron spec.
   * @throws If `spec` is malformed.
   */
  schedule(spec: ICronSpec<TMonthName, TWeekdayName>, callback: () => void): IScheduledHandle;
}
