import type { ITimerHandle } from "@time-provider/core";
import type { DayOfWeekName, ICronSpec, MonthName } from "./cron-parser.ts";

/**
 * The shape this addon adds to a composed Time-Provider: a `cron` property exposing
 * {@link ICronApi}. Parameterized by the calendar's month/day-of-week names, defaulting to the
 * Gregorian ones every plugin shipped today uses.
 */
export type WithCronApi<
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
> = {
  /**
   * Schedules and cancels callbacks running on cron schedules, evaluated in this runtime's own
   * local timezone (`"Etc/UTC"` on a UTC-only runtime) - see {@link ICronApi}.
   */
  cron: ICronApi<TMonthName, TWeekdayName>;
};

/**
 * The cron API facade this addon adds to a composed Time-Provider, reachable as
 * `timeProvider.cron` once composed via `createTimeProvider.for(plugin).use(thisAddon)`.
 */
export interface ICronApi<
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
> {
  /**
   * Schedules `callback` to run every time `expression` next matches, in the runtime's local
   * timezone (`"Etc/UTC"` for a UTC-only runtime).
   * @param expression a standard 5-field cron expression (`minute hour day-of-month month
   * day-of-week`), e.g. `"0 9 * * MON-FRI"` or `"*\/15 8-18 * * *"`.
   * @throws if `expression` is malformed.
   */
  schedule(expression: string, callback: () => void): ITimerHandle;
  /**
   * Schedules `callback` to run every time `spec` next matches, in the runtime's local timezone
   * (`"Etc/UTC"` for a UTC-only runtime). A JSON-friendly alternative to the cron expression
   * string form, for callers who'd rather avoid its positional/symbolic syntax - see
   * {@link ICronSpec}. `cronExpressionToSpec` translates an existing cron expression string into
   * this form.
   * @throws if `spec` is malformed.
   */
  schedule(spec: ICronSpec<TMonthName, TWeekdayName>, callback: () => void): ITimerHandle;
  /**
   * Cancels a schedule previously created via {@link ICronApi.schedule}. A no-op if it was
   * already cancelled.
   */
  unschedule(handle: ITimerHandle): void;
}
