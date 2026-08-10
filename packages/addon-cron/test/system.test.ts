import { describe, expect, test } from "vite-plus/test";
import {
  DefaultCalendarScheme,
  type DueHandle,
  type ITimeConverter,
  type IScheduler,
  type IRuntime,
} from "@time-provider/core";
import { addon } from "../src/index.ts";
import { CronScheduler } from "../src/cron-scheduler.ts";
import { computeNextOccurrence, parseCronExpression } from "../src/cron-parser.ts";

type FakeRuntime = IRuntime<unknown> & { cron?: unknown };

const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => Number(time),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};
const defaultCalendarScheme = new DefaultCalendarScheme(identityConverter);

/*
 * applyToRuntime only touches what it's documented to (define `.cron`, read `.clock` and
 * `.scheduler`), so a minimal object satisfies it for a focused unit test without needing a real
 * plugin/runtime - the cast is safe because these tests never exercise anything else on the fake
 * runtime.
 */
function fakeSystemRuntime(
  now: number,
  timezone?: string,
): {
  runtime: FakeRuntime;
  recurring: { callback: () => number | false; initialDelay?: number }[];
} {
  const recurring: { callback: () => number | false; initialDelay?: number }[] = [];
  const scheduler: IScheduler = {
    setTimeout() {
      throw new Error("not used by the cron addon");
    },
    clearTimeout() {
      throw new Error("not used by the cron addon");
    },
    setInterval() {
      throw new Error("not used by the cron addon");
    },
    clearInterval() {
      throw new Error("not used by the cron addon");
    },
    setRecurring(callback, initialDelay) {
      recurring.push({ callback, initialDelay });
      return {} as DueHandle;
    },
    clearRecurring() {},
    queueMicrotask() {
      throw new Error("not used by the cron addon");
    },
  };
  const clock =
    timezone === undefined ? { timestampNow: () => now } : { timestampNow: () => now, timezone };
  return {
    runtime: { scheduler, clock, calendarScheme: defaultCalendarScheme } as unknown as FakeRuntime,
    recurring,
  };
}

describe("cronAddon (system)", () => {
  test("applyToRuntime defines .cron with a CronScheduler", () => {
    const { runtime } = fakeSystemRuntime(0, "Etc/UTC");
    addon.applyToRuntime(runtime);
    expect(runtime.cron).toBeInstanceOf(CronScheduler);
  });

  test("applyToRuntime's defined property is enumerable but not writable", () => {
    const { runtime } = fakeSystemRuntime(0, "Etc/UTC");
    addon.applyToRuntime(runtime);
    const descriptor = Object.getOwnPropertyDescriptor(runtime, "cron");
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.writable).toBe(false);
  });

  test("wires .cron to the runtime's own scheduler", () => {
    const { runtime, recurring } = fakeSystemRuntime(Date.UTC(2024, 0, 1, 10, 30, 0), "Etc/UTC");
    addon.applyToRuntime(runtime);
    (runtime.cron as CronScheduler<number>).schedule("* * * * *", () => {});
    expect(recurring).toHaveLength(1);
  });

  test("wires .cron to the runtime clock's timezone", () => {
    const now = Date.UTC(2024, 2, 25, 10, 0, 0);
    const { runtime, recurring } = fakeSystemRuntime(now, "Europe/Paris");
    addon.applyToRuntime(runtime);
    (runtime.cron as CronScheduler<number>).schedule("0 9 * * *", () => {});
    const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
    expect(recurring[0]?.initialDelay).toBe(
      computeNextOccurrence(parsed, now, "Europe/Paris", defaultCalendarScheme) - now,
    );
  });

  test("defaults to Etc/UTC when the runtime clock has no timezone (UTC-only runtime)", () => {
    const now = Date.UTC(2024, 2, 25, 10, 0, 0);
    const { runtime, recurring } = fakeSystemRuntime(now);
    addon.applyToRuntime(runtime);
    (runtime.cron as CronScheduler<number>).schedule("0 9 * * *", () => {});
    const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
    expect(recurring[0]?.initialDelay).toBe(
      computeNextOccurrence(parsed, now, "Etc/UTC", defaultCalendarScheme) - now,
    );
  });

  describe("clone", () => {
    test("returns a distinct instance", () => {
      expect(addon.clone()).not.toBe(addon);
    });

    test("returns a distinct addon that still applies a CronScheduler", () => {
      const cloned = addon.clone();
      const { runtime } = fakeSystemRuntime(0, "Etc/UTC");
      cloned.applyToRuntime(runtime);
      expect(runtime.cron).toBeInstanceOf(CronScheduler);
    });
  });
});
