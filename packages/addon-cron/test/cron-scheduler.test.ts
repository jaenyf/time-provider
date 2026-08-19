import { describe, expect, test } from "vite-plus/test";
import {
  DefaultCalendarScheme,
  type ITimerHandle,
  type ITimers,
  type ITimeConverter,
  toInstant,
  type IDurationSpec,
  asEpochMilliseconds,
} from "@time-provider/core";
import { computeNextOccurrence, parseCronExpression } from "../src/cron-parser.ts";
import { CronScheduler } from "../src/cron-scheduler.ts";

/*
 * CronScheduler works purely in epoch milliseconds here too - see cron-parser.test.ts's identity
 * converter/default adapter note.
 */
const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => toInstant({ milliseconds: Number(time) }),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};
const defaultCalendarScheme = new DefaultCalendarScheme(identityConverter);

/*
 * CronScheduler only ever touches Itimers.setRecurring/clearRecurring, so a minimal fake
 * capturing those calls is enough to test the delay computation and re-arming logic without a
 * real runtime.
 */
function faketimers(): {
  timers: ITimers;
  recurring: { callback: () => IDurationSpec | false; initialDelay?: IDurationSpec }[];
  cleared: ITimerHandle[];
} {
  const recurring: { callback: () => IDurationSpec | false; initialDelay?: IDurationSpec }[] = [];
  const cleared: ITimerHandle[] = [];
  const handle = {
    kind: 2,
    isDisposed: false,
    dispose: () => {
      cleared.push(handle);
    },
  } as unknown as ITimerHandle;
  return {
    recurring,
    cleared,
    timers: {
      once() {
        throw new Error("not used by CronScheduler");
      },
      every() {
        throw new Error("not used by CronScheduler");
      },
      recurring(callback, initialDelay) {
        recurring.push({ callback, initialDelay });
        return handle;
      },
      wait() {
        throw new Error("not used by CronScheduler");
      },
    },
  };
}

describe("CronScheduler", () => {
  test("schedule() parses the expression eagerly, before ever touching the timers", () => {
    const { timers, recurring } = faketimers();
    let now = asEpochMilliseconds();
    const sut = new CronScheduler(
      timers,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    expect(() => sut.schedule("not a cron expression", () => {})).toThrow(
      /Invalid cron expression/,
    );
    expect(recurring).toHaveLength(0);
  });

  test("schedule() arms setRecurring with the delay to the first matching occurrence", () => {
    const { timers, recurring } = faketimers();
    const now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 10, 30, 0) });
    const sut = new CronScheduler(
      timers,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    sut.schedule("* * * * *", () => {});
    expect(recurring).toHaveLength(1);
    expect(recurring[0]?.initialDelay?.milliseconds).toBe(Date.UTC(2024, 0, 1, 10, 31, 0) - now);
  });

  test("the recurring callback runs the user callback, then re-derives the next delay", () => {
    const { timers, recurring } = faketimers();
    const now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 10, 30, 0) });
    const sut = new CronScheduler(
      timers,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    const runs: number[] = [];
    sut.schedule("* * * * *", () => runs.push(now));

    const nextDelay = recurring[0]?.callback();
    expect(runs).toEqual([now]);
    expect((nextDelay as IDurationSpec).milliseconds).toBe(60_000);
  });

  test("re-arms are computed from the schedule's own occurrence chain, not from timestampNow() at rearm time", () => {
    // On a deterministic runtime, a single advance() sets the clock to its final target *before*
    // draining any due callback - by the time a mid-batch cron callback actually runs,
    // timestampNow() already reflects that unrelated future instant, not the occurrence being
    // processed. The delay computation must not depend on it past the very first schedule() call.
    const { timers, recurring } = faketimers();
    let now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 10, 30, 0) });
    const sut = new CronScheduler(
      timers,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    sut.schedule("* * * * *", () => {});

    now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 12, 0, 0) });
    const nextDelay = recurring[0]?.callback();
    expect((nextDelay as IDurationSpec).milliseconds).toBe(60_000);
  });

  test("chains through several consecutive occurrences even while timestampNow() never advances (a batched drain)", () => {
    const { timers, recurring } = faketimers();
    const now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 0, 0, 0) });
    const sut = new CronScheduler(
      timers,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    sut.schedule("0 9,10,11 * * *", () => {});

    expect(recurring[0]?.initialDelay?.milliseconds).toBe(Date.UTC(2024, 0, 1, 9, 0, 0) - now);
    expect((recurring[0]?.callback() as IDurationSpec)?.milliseconds).toBe(60 * 60_000); // 09:00 -> 10:00
    expect((recurring[0]?.callback() as IDurationSpec)?.milliseconds).toBe(60 * 60_000); // 10:00 -> 11:00
    expect((recurring[0]?.callback() as IDurationSpec)?.milliseconds).toBe(22 * 60 * 60_000); // 11:00 -> next day's 09:00
  });

  test("a throwing callback propagates to the timers, rather than being caught and re-reported by cron itself", () => {
    // The runtime owns the one policy for a throwing timers callback (rethrow in a Node-like
    // environment, log in a browser-like one - see Itimers). Catching here would hide cron's
    // failures from it, so the exception has to leave this callback untouched.
    const { timers, recurring } = faketimers();
    const now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 10, 30, 0) });
    const sut = new CronScheduler(
      timers,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    const error = new Error("boom");
    sut.schedule("* * * * *", () => {
      throw error;
    });

    expect(() => recurring[0]?.callback()).toThrow(error);
  });

  test("unschedule() delegates to the runtime timers's clearRecurring with the same handle", () => {
    const { timers, cleared } = faketimers();
    const sut = new CronScheduler(
      timers,
      () => asEpochMilliseconds(),
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    const handle = sut.schedule("* * * * *", () => {});
    sut.unschedule(handle);
    expect(cleared).toEqual([handle]);
  });

  test("schedule() also accepts a JSON ICronSpec instead of a cron expression string", () => {
    const { timers, recurring } = faketimers();
    const now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 8, 0, 0) });
    const sut = new CronScheduler(
      timers,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    sut.schedule({ minute: 30, hour: 9 }, () => {});
    expect(recurring[0]?.initialDelay?.milliseconds).toBe(Date.UTC(2024, 0, 1, 9, 30, 0) - now);
  });

  test("schedule() with a spec throws the same way an invalid spec field would", () => {
    const { timers, recurring } = faketimers();
    const sut = new CronScheduler(
      timers,
      () => asEpochMilliseconds(),
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    expect(() => sut.schedule({ minute: 60 }, () => {})).toThrow(/out of range/);
    expect(recurring).toHaveLength(0);
  });

  test("resolves delays against the runtime's timezone", () => {
    const { timers, recurring } = faketimers();
    const now = toInstant({ milliseconds: Date.UTC(2024, 2, 25, 10, 0, 0) });
    const sut = new CronScheduler(
      timers,
      () => now,
      () => "Europe/Paris",
      defaultCalendarScheme,
    );
    sut.schedule("0 9 * * *", () => {});
    const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
    expect(recurring[0]?.initialDelay?.milliseconds).toBe(
      computeNextOccurrence(parsed, now, "Europe/Paris", defaultCalendarScheme) - now,
    );
  });

  describe("issue: a schedule must use the timezone the clock has when it is created", () => {
    test("a schedule created after the timezone changed uses the new one", () => {
      const { timers, recurring } = faketimers();
      const now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 0, 0, 0) });
      let timezone = "Etc/UTC";
      const sut = new CronScheduler(
        timers,
        () => now,
        () => timezone,
        defaultCalendarScheme,
      );

      timezone = "Asia/Tokyo";
      sut.schedule("0 9 * * *", () => {});

      const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
      expect(recurring[0]?.initialDelay?.milliseconds).toBe(
        computeNextOccurrence(parsed, now, "Asia/Tokyo", defaultCalendarScheme) - now,
      );
      // 09:00 in Tokyo is 00:00Z, so the delay must not be the 9h a UTC reading would give.
      expect(recurring[0]?.initialDelay?.milliseconds).not.toBe(
        computeNextOccurrence(parsed, now, "Etc/UTC", defaultCalendarScheme) - now,
      );
    });

    test("an already-created schedule keeps its own timezone when the clock's changes later", () => {
      const { timers, recurring } = faketimers();
      const now = toInstant({ milliseconds: Date.UTC(2024, 0, 1, 0, 0, 0) });
      let timezone = "Etc/UTC";
      const sut = new CronScheduler(
        timers,
        () => now,
        () => timezone,
        defaultCalendarScheme,
      );
      sut.schedule("0 9 * * *", () => {});

      timezone = "Asia/Tokyo";
      const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
      const utcOccurrence = computeNextOccurrence(parsed, now, "Etc/UTC", defaultCalendarScheme);
      // Re-arming still walks the UTC occurrence chain this schedule started on.
      expect((recurring[0]?.callback() as IDurationSpec)?.milliseconds).toBe(
        computeNextOccurrence(parsed, utcOccurrence, "Etc/UTC", defaultCalendarScheme) -
          utcOccurrence,
      );
    });
  });
});
