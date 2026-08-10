import { describe, expect, test } from "vite-plus/test";
import {
  DefaultCalendarScheme,
  type DueHandle,
  type IScheduler,
  type ITimeConverter,
} from "@time-provider/core";
import { computeNextOccurrence, parseCronExpression } from "../src/cron-parser.ts";
import { CronScheduler } from "../src/cron-scheduler.ts";

/*
 * CronScheduler works purely in epoch milliseconds here too - see cron-parser.test.ts's identity
 * converter/default adapter note.
 */
const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => Number(time),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};
const defaultCalendarScheme = new DefaultCalendarScheme(identityConverter);

/*
 * CronScheduler only ever touches IScheduler.setRecurring/clearRecurring, so a minimal fake
 * capturing those calls is enough to test the delay computation and re-arming logic without a
 * real runtime.
 */
function fakeScheduler(): {
  scheduler: IScheduler;
  recurring: { callback: () => number | false; initialDelay?: number }[];
  cleared: DueHandle[];
} {
  const recurring: { callback: () => number | false; initialDelay?: number }[] = [];
  const cleared: DueHandle[] = [];
  const handle = { kind: 2 } as unknown as DueHandle;
  return {
    recurring,
    cleared,
    scheduler: {
      setTimeout() {
        throw new Error("not used by CronScheduler");
      },
      clearTimeout() {
        throw new Error("not used by CronScheduler");
      },
      setInterval() {
        throw new Error("not used by CronScheduler");
      },
      clearInterval() {
        throw new Error("not used by CronScheduler");
      },
      setRecurring(callback, initialDelay) {
        recurring.push({ callback, initialDelay });
        return handle;
      },
      clearRecurring(h) {
        cleared.push(h);
      },
    },
  };
}

describe("CronScheduler", () => {
  test("schedule() parses the expression eagerly, before ever touching the scheduler", () => {
    const { scheduler, recurring } = fakeScheduler();
    let now = 0;
    const sut = new CronScheduler(
      scheduler,
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
    const { scheduler, recurring } = fakeScheduler();
    const now = Date.UTC(2024, 0, 1, 10, 30, 0);
    const sut = new CronScheduler(
      scheduler,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    sut.schedule("* * * * *", () => {});
    expect(recurring).toHaveLength(1);
    expect(recurring[0]?.initialDelay).toBe(Date.UTC(2024, 0, 1, 10, 31, 0) - now);
  });

  test("the recurring callback runs the user callback, then re-derives the next delay", () => {
    const { scheduler, recurring } = fakeScheduler();
    const now = Date.UTC(2024, 0, 1, 10, 30, 0);
    const sut = new CronScheduler(
      scheduler,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    const runs: number[] = [];
    sut.schedule("* * * * *", () => runs.push(now));

    const nextDelay = recurring[0]?.callback();
    expect(runs).toEqual([now]);
    expect(nextDelay).toBe(60_000);
  });

  test("re-arms are computed from the schedule's own occurrence chain, not from timestampNow() at rearm time", () => {
    // On a deterministic runtime, a single advance() sets the clock to its final target *before*
    // draining any due callback - by the time a mid-batch cron callback actually runs,
    // timestampNow() already reflects that unrelated future instant, not the occurrence being
    // processed. The delay computation must not depend on it past the very first schedule() call.
    const { scheduler, recurring } = fakeScheduler();
    let now = Date.UTC(2024, 0, 1, 10, 30, 0);
    const sut = new CronScheduler(
      scheduler,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    sut.schedule("* * * * *", () => {});

    now = Date.UTC(2024, 0, 1, 12, 0, 0);
    const nextDelay = recurring[0]?.callback();

    expect(nextDelay).toBe(60_000);
  });

  test("chains through several consecutive occurrences even while timestampNow() never advances (a batched drain)", () => {
    const { scheduler, recurring } = fakeScheduler();
    const now = Date.UTC(2024, 0, 1, 0, 0, 0);
    const sut = new CronScheduler(
      scheduler,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    sut.schedule("0 9,10,11 * * *", () => {});

    expect(recurring[0]?.initialDelay).toBe(Date.UTC(2024, 0, 1, 9, 0, 0) - now);
    expect(recurring[0]?.callback()).toBe(60 * 60_000); // 09:00 -> 10:00
    expect(recurring[0]?.callback()).toBe(60 * 60_000); // 10:00 -> 11:00
    expect(recurring[0]?.callback()).toBe(22 * 60 * 60_000); // 11:00 -> next day's 09:00
  });

  test("a throwing callback propagates to the scheduler, rather than being caught and re-reported by cron itself", () => {
    // The runtime owns the one policy for a throwing scheduler callback (rethrow in a Node-like
    // environment, log in a browser-like one - see IScheduler). Catching here would hide cron's
    // failures from it, so the exception has to leave this callback untouched.
    const { scheduler, recurring } = fakeScheduler();
    const now = Date.UTC(2024, 0, 1, 10, 30, 0);
    const sut = new CronScheduler(
      scheduler,
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

  test("unschedule() delegates to the runtime scheduler's clearRecurring with the same handle", () => {
    const { scheduler, cleared } = fakeScheduler();
    const sut = new CronScheduler(
      scheduler,
      () => 0,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    const handle = sut.schedule("* * * * *", () => {});
    sut.unschedule(handle);
    expect(cleared).toEqual([handle]);
  });

  test("schedule() also accepts a JSON ICronSpec instead of a cron expression string", () => {
    const { scheduler, recurring } = fakeScheduler();
    const now = Date.UTC(2024, 0, 1, 8, 0, 0);
    const sut = new CronScheduler(
      scheduler,
      () => now,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    sut.schedule({ minute: 30, hour: 9 }, () => {});
    expect(recurring[0]?.initialDelay).toBe(Date.UTC(2024, 0, 1, 9, 30, 0) - now);
  });

  test("schedule() with a spec throws the same way an invalid spec field would", () => {
    const { scheduler, recurring } = fakeScheduler();
    const sut = new CronScheduler(
      scheduler,
      () => 0,
      () => "Etc/UTC",
      defaultCalendarScheme,
    );
    expect(() => sut.schedule({ minute: 60 }, () => {})).toThrow(/out of range/);
    expect(recurring).toHaveLength(0);
  });

  test("resolves delays against the runtime's timezone", () => {
    const { scheduler, recurring } = fakeScheduler();
    const now = Date.UTC(2024, 2, 25, 10, 0, 0);
    const sut = new CronScheduler(
      scheduler,
      () => now,
      () => "Europe/Paris",
      defaultCalendarScheme,
    );
    sut.schedule("0 9 * * *", () => {});
    const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
    expect(recurring[0]?.initialDelay).toBe(
      computeNextOccurrence(parsed, now, "Europe/Paris", defaultCalendarScheme) - now,
    );
  });

  describe("issue: a schedule must use the timezone the clock has when it is created", () => {
    test("a schedule created after the timezone changed uses the new one", () => {
      const { scheduler, recurring } = fakeScheduler();
      const now = Date.UTC(2024, 0, 1, 0, 0, 0);
      let timezone = "Etc/UTC";
      const sut = new CronScheduler(
        scheduler,
        () => now,
        () => timezone,
        defaultCalendarScheme,
      );

      timezone = "Asia/Tokyo";
      sut.schedule("0 9 * * *", () => {});

      const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
      expect(recurring[0]?.initialDelay).toBe(
        computeNextOccurrence(parsed, now, "Asia/Tokyo", defaultCalendarScheme) - now,
      );
      // 09:00 in Tokyo is 00:00Z, so the delay must not be the 9h a UTC reading would give.
      expect(recurring[0]?.initialDelay).not.toBe(
        computeNextOccurrence(parsed, now, "Etc/UTC", defaultCalendarScheme) - now,
      );
    });

    test("an already-created schedule keeps its own timezone when the clock's changes later", () => {
      const { scheduler, recurring } = fakeScheduler();
      const now = Date.UTC(2024, 0, 1, 0, 0, 0);
      let timezone = "Etc/UTC";
      const sut = new CronScheduler(
        scheduler,
        () => now,
        () => timezone,
        defaultCalendarScheme,
      );
      sut.schedule("0 9 * * *", () => {});

      timezone = "Asia/Tokyo";
      const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
      const utcOccurrence = computeNextOccurrence(parsed, now, "Etc/UTC", defaultCalendarScheme);
      // Re-arming still walks the UTC occurrence chain this schedule started on.
      expect(recurring[0]?.callback()).toBe(
        computeNextOccurrence(parsed, utcOccurrence, "Etc/UTC", defaultCalendarScheme) -
          utcOccurrence,
      );
    });
  });
});
