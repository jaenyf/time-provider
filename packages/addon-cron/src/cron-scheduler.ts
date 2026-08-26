import {
  type IScheduledHandle,
  type IDurationSpec,
  type IAddon,
  AddonBase,
  type IRuntime,
  AddonHelper,
} from "@time-provider/core";
import {
  computeNextOccurrence,
  parseCronExpression,
  parseCronSpec,
  type DayOfWeekName,
  type ICronSpec,
  type MonthName,
} from "./cron-parser.ts";
import type { ICronApi, WithCronApi } from "./types.ts";

/**
 * Implements {@link ICronApi} on top of `ITimers.recurring`, re-deriving the delay to the
 * next occurrence after every run. Generic over `TDate`, delegated to `adapter` for every
 * calendar/timezone computation - see {@link ICalendarScheme} - so the same implementation backs
 * every plugin, and each one's own calendar/timezone behavior (if it diverges from the shared
 * default) is honored automatically.
 */
export class CronScheduler<
  TDate,
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
>
  extends AddonBase<TDate>
  implements
    ICronApi<TDate, TMonthName, TWeekdayName>,
    IAddon<TDate>,
    WithCronApi<TDate, TMonthName, TWeekdayName>
{
  #isDisposed: boolean;

  /**
   * @param timers the runtime's timers used to run due callbacks.
   * @param timestampNow reads the runtime's current time, in epoch milliseconds. Side-effect-free
   * by contract - see {@link ITimestampClock.timestampNow} - which is what lets `schedule()` read
   * it once to compute the first delay and trust that `ITimers.recurring` reads the same
   * "now" internally to turn that delay into an absolute run time.
   * @param timezone reads the IANA timezone cron expressions are evaluated against. Called once
   * per {@link schedule} so a schedule created after `IClock.withTimezone` uses the timezone the
   * clock has by then; each schedule then keeps that timezone for its whole life, since retiming
   * a running job underneath its owner would be the more surprising behaviour.
   * @param adapter the runtime's calendar scheme - see {@link ICalendarScheme}.
   */
  constructor() {
    super();
    this.#isDisposed = false;
  }

  get cron(): ICronApi<TDate, TMonthName, TWeekdayName> {
    return this;
  }

  private getClockTimezone(): string {
    const clock = this.runtime.clock;
    return "timezone" in clock ? clock.timezone : "Etc/UTC";
  }

  dispose(): void {
    //no need to dispose any ScheduledHandle here as they are tracked by the runtime being disposed
    this.#isDisposed = true;
  }
  get isDisposed(): boolean {
    return this.#isDisposed;
  }
  [Symbol.dispose](): void {
    this.dispose();
  }

  applyToRuntimeImpl(runtime: IRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(runtime, "cron", this);
  }

  schedule(expression: string, callback: () => void): IScheduledHandle;
  schedule(spec: ICronSpec<TMonthName, TWeekdayName>, callback: () => void): IScheduledHandle;
  schedule(
    expressionOrSpec: string | ICronSpec<TMonthName, TWeekdayName>,
    callback: () => void,
  ): IScheduledHandle {
    const calendarScheme = this.runtime.calendarScheme;
    const timezone = this.getClockTimezone();
    const parsed =
      typeof expressionOrSpec === "string"
        ? parseCronExpression(expressionOrSpec, calendarScheme)
        : parseCronSpec(expressionOrSpec as ICronSpec<MonthName, DayOfWeekName>, calendarScheme);
    /*
      Anchored to the schedule's own last computed occurrence, not a fresh `timestampNow()` read
      on every rearm: on a deterministic runtime, a single advance() can drain several due
      callbacks in one batch, and by the time a later one runs, timestampNow() already reflects
      advance()'s final target - not the instant this particular occurrence is actually due at.
      Re-querying it there would skip every occurrence between "now" and that final target.
    */
    let lastOccurrence = calendarScheme.fromTimestamp(this.runtime.timestampNow());
    const nextDelay = (): IDurationSpec => {
      const next = computeNextOccurrence(parsed, lastOccurrence, timezone, calendarScheme);
      const delay = calendarScheme.toTimestamp(next) - calendarScheme.toTimestamp(lastOccurrence);
      lastOccurrence = next;
      return { milliseconds: delay };
    };
    /*
      `callback` is invoked without a try/catch on purpose: a throwing cron callback is just a
      throwing scheduler callback, and the runtime already has one policy for those - rethrow in a
      Node-like environment, log and carry on in a browser-like one (see ITimers). Catching here
      would put cron on a third path of its own, invisible to that policy. It does mean a run that
      throws stops the schedule, exactly as `setRecurring` documents; catch inside your own callback
      if a failing run should not end the job.
    */
    return this.runtime.timers.recurring(() => {
      callback();
      return nextDelay();
    }, nextDelay());
  }
}
