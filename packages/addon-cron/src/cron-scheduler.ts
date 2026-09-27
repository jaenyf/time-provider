import {
  type IScheduledHandle,
  type IAddon,
  AddonBase,
  type IRuntime,
  AddonHelper,
  type EpochMilliseconds,
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

/** Implements {@link ICronApi} using runtime timers and calendar schemes. */
export class CronScheduler<
  TDate,
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
>
  extends AddonBase<TDate, IRuntime<TDate>>
  implements ICronApi<TDate, TMonthName, TWeekdayName>, IAddon<TDate>
{
  #isDisposed: boolean;

  constructor() {
    super();
    this.#isDisposed = false;
  }

  private getClockTimezone(): string {
    const clock = this.runtimeClock;
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
      "scheduler.cron",
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
    const clock = this.runtimeClock;
    const nextAfter = (time: EpochMilliseconds): EpochMilliseconds =>
      calendarScheme.toTimestamp(
        computeNextOccurrence(parsed, calendarScheme.fromTimestamp(time), timezone, calendarScheme),
      );
    const scheduledAt = clock.timestampNow();
    let due = nextAfter(scheduledAt);
    // A wake before `due` means the wall clock went back: wait again. After it, run once, even if
    // the wall clock skipped several occurrences.
    /*
      `callback` is invoked without a try/catch on purpose: a throwing cron callback is just a
      throwing scheduler callback, and the runtime already has one policy for those - rethrow in a
      Node-like environment, log and carry on in a browser-like one (see ITimers). Catching here
      would put cron on a third path of its own, invisible to that policy. It does mean a run that
      throws stops the schedule, exactly as `recurring` documents; catch inside your own callback
      if a failing run should not end the job.
    */
    return this.runtimeTimers.recurring(
      () => {
        const now = clock.timestampNow();
        if (now >= due) {
          callback();
          due = nextAfter(Math.max(due, now) as EpochMilliseconds);
        }
        return { milliseconds: due - now };
      },
      { milliseconds: due - scheduledAt },
    );
  }
}
