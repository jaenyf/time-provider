import { describe, expect, test } from "vite-plus/test";
import {
  DefaultCalendarScheme,
  type IScheduledHandle,
  type ITimeConverter,
  type ITimers,
  type IRuntime,
  toInstant,
  type IDurationSpec,
  type IAddon,
} from "@time-provider/core";
import { addon as addonBuilderFactory } from "../src/index.ts";
import { CronScheduler } from "../src/cron-scheduler.ts";
import { computeNextOccurrence, parseCronExpression } from "../src/cron-parser.ts";

const cronAddon = addonBuilderFactory().create();

type FakeRuntime = IRuntime<unknown> & { cron?: unknown };

const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => toInstant({ milliseconds: Number(time) }),
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
  recurring: { callback: () => IDurationSpec | false; initialDelay?: IDurationSpec }[];
} {
  const recurring: { callback: () => IDurationSpec | false; initialDelay?: IDurationSpec }[] = [];
  const timers: ITimers = {
    once() {
      throw new Error("not used by the cron addon");
    },
    every() {
      throw new Error("not used by the cron addon");
    },
    recurring(callback, initialDelay) {
      recurring.push({ callback, initialDelay });
      return {} as IScheduledHandle;
    },
    wait() {
      throw new Error("not used by the cron addon");
    },
  };
  const clock =
    timezone === undefined ? { timestampNow: () => now } : { timestampNow: () => now, timezone };
  return {
    runtime: {
      timers,
      clock,
      calendarScheme: defaultCalendarScheme,
      registerAddon: (_addon: IAddon<unknown>) => {},
    } as unknown as FakeRuntime,
    recurring,
  };
}

describe("cronAddon (system)", () => {
  test("applyToRuntime defines .cron with a CronScheduler", () => {
    const { runtime } = fakeSystemRuntime(0, "Etc/UTC");
    cronAddon.applyToRuntime(runtime);
    expect(runtime.cron).toBeInstanceOf(CronScheduler);
  });

  test("applyToRuntime's defined property is enumerable but not writable", () => {
    const { runtime } = fakeSystemRuntime(0, "Etc/UTC");
    cronAddon.applyToRuntime(runtime);
    const descriptor = Object.getOwnPropertyDescriptor(runtime, "cron");
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.writable).toBe(false);
  });

  test("wires .cron to the runtime's own scheduler", () => {
    const { runtime, recurring } = fakeSystemRuntime(Date.UTC(2024, 0, 1, 10, 30, 0), "Etc/UTC");
    cronAddon.applyToRuntime(runtime);
    (runtime.cron as CronScheduler<number>).schedule("* * * * *", () => {});
    expect(recurring).toHaveLength(1);
  });

  test("wires .cron to the runtime clock's timezone", () => {
    const now = Date.UTC(2024, 2, 25, 10, 0, 0);
    const { runtime, recurring } = fakeSystemRuntime(now, "Europe/Paris");
    cronAddon.applyToRuntime(runtime);
    (runtime.cron as CronScheduler<number>).schedule("0 9 * * *", () => {});
    const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
    expect(recurring[0]?.initialDelay?.milliseconds).toBe(
      computeNextOccurrence(parsed, now, "Europe/Paris", defaultCalendarScheme) - now,
    );
  });

  test("defaults to Etc/UTC when the runtime clock has no timezone (UTC-only runtime)", () => {
    const now = Date.UTC(2024, 2, 25, 10, 0, 0);
    const { runtime, recurring } = fakeSystemRuntime(now);
    cronAddon.applyToRuntime(runtime);
    (runtime.cron as CronScheduler<number>).schedule("0 9 * * *", () => {});
    const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
    expect(recurring[0]?.initialDelay?.milliseconds).toBe(
      computeNextOccurrence(parsed, now, "Etc/UTC", defaultCalendarScheme) - now,
    );
  });

  test("addon() returns an independent builder each call", () => {
    const first = addonBuilderFactory().create();
    const second = addonBuilderFactory().create();
    expect(first).not.toBe(second);
    const { runtime } = fakeSystemRuntime(0, "Etc/UTC");
    second.applyToRuntime(runtime);
    expect(runtime.cron).toBeInstanceOf(CronScheduler);
  });
});
