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
import type { ICronApi } from "./types.ts";

/**
 * Implements {@link ICronApi} on top of `ITimers.recurring`, re-deriving the delay to the
 * next occurrence after every run. Generic over `TDate`, delegated to the runtime's own
 * calendar scheme for every calendar/timezone computation - see {@link ICalendarScheme} - so
 * the same implementation backs every plugin, and each one's own calendar/timezone behavior
 * (if it diverges from the shared default) is honored automatically.
 */
export class CronScheduler<
  TDate,
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
>
  extends AddonBase<TDate>
  implements ICronApi<TDate, TMonthName, TWeekdayName>, IAddon<TDate>
{
  #isDisposed: boolean;

  constructor() {
    super();
    this.#isDisposed = false;
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
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "cron",
      { schedule: this.schedule.bind(this) },
      this,
    );
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
