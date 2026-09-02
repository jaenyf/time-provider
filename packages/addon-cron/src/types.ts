import type { IScheduledHandle } from "@time-provider/core";
import type { DayOfWeekName, ICronSpec, MonthName } from "./cron-parser.ts";

/**
 * The shape this addon adds to a composed Time-Provider: a `cron` property exposing
 * {@link ICronApi}. Parameterized by the calendar's month/day-of-week names, defaulting to the
 * Gregorian ones every plugin shipped today uses.
 */
export type WithCronApi<
  TDate,
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
> = {
  /**
   * Schedules and cancels callbacks running on cron schedules, evaluated in this runtime's own
   * local timezone (`"Etc/UTC"` on a UTC-only runtime) - see {@link ICronApi}.
   */
  cron: ICronApi<TDate, TMonthName, TWeekdayName>;
};

/**
 * The cron API facade this addon adds to a composed Time-Provider, reachable as
 * `timeProvider.cron` once composed via `createTimeProvider.for(plugin).use(thisAddon)`. Doesn't
 * extend `IAddon<TDate>` (unlike the underlying `CronScheduler`): the facade actually reachable at
 * `.cron` deliberately drops the addon's own lifecycle members (`.runtime`, `.applyToRuntime`,
 * `.dispose`, `.isDisposed`) - a consumer has no business calling those - so the type shouldn't
 * promise them either.
 */
export interface ICronApi<
  // Kept generic over TDate for symmetry with WithCronApi<TDate> and the rest of the *Api<TDate>
  // family, even though no member here happens to reference it.
  // oxlint-disable-next-line no-unused-vars
  TDate,
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
  schedule(expression: string, callback: () => void): IScheduledHandle;
  /**
   * Schedules `callback` to run every time `spec` next matches, in the runtime's local timezone
   * (`"Etc/UTC"` for a UTC-only runtime). A JSON-friendly alternative to the cron expression
   * string form, for callers who'd rather avoid its positional/symbolic syntax - see
   * {@link ICronSpec}. `cronExpressionToSpec` translates an existing cron expression string into
   * this form.
   * @throws if `spec` is malformed.
   */
  schedule(spec: ICronSpec<TMonthName, TWeekdayName>, callback: () => void): IScheduledHandle;
}
