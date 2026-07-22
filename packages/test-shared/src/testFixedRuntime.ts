import { expect, test, describe } from "vite-plus/test";
import type { IPlugin, IUtcOnlyPlugin, TimezoneDefinition } from "@time-provider/core";
import { testScheduler } from "./helpers/testScheduler.ts";
import { testParser } from "./helpers/testParser.ts";
import {
  testConstructorArgs,
  testWithTimezone,
  testLocalNow,
  testUtcNow,
} from "./helpers/testHelpers.ts";

export function testFixedRuntime<TDate>(
  plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  const createFixedRuntime = (timezone: TimezoneDefinition, initialTime: string | number | TDate) =>
    plugin.supportsLocalTime
      ? plugin.createFixedRuntime(timezone, initialTime)
      : plugin.createFixedRuntime(initialTime);

  const createSUT = () => createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");

  testConstructorArgs(
    "createFixedRuntime",
    createSUT,
    (initialTime) => createFixedRuntime("Pacific/Kiritimati", initialTime),
    parseTimeToUtc,
  );

  describe("fixed", () => {
    testLocalNow(plugin.supportsLocalTime, createSUT, () =>
      parseTimeToLocal("2026-01-01T14:00+14:00"),
    );
    testWithTimezone<TDate>(plugin.supportsLocalTime, createSUT);
    testUtcNow(createSUT, () => parseTimeToUtc("2026-01-01T00:00:00.000Z"));

    describe("parser", () => {
      testParser(plugin, parseTimeToUtc, parseTimeToLocal);
    });

    describe("scheduler", () => {
      testScheduler(() => createSUT().scheduler, true);
      describe("issue#57", () => {
        //see: https://github.com/jaenyf/time-provider/issues/57
        test.each([0, -1, -100])("a zero-or-negative-delay timeout should not fire", (delay) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let timeoutCalled = false;
          sut.scheduler.setTimeout(() => {
            timeoutCalled = true;
          }, delay);
          expect(timeoutCalled).toBe(false);
        });
        test.each([0, -1, -100])("a zero-or-negative-delay interval should not fire", (delay) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let intervalCalled = false;
          sut.scheduler.setInterval(() => {
            intervalCalled = true;
          }, delay);
          expect(intervalCalled).toBe(false);
        });
        test.each([1, 2, 100])("a positive-delay timeout should not fire", (delay) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let timeoutCalled = false;
          sut.scheduler.setTimeout(() => {
            timeoutCalled = true;
          }, delay);
          expect(timeoutCalled).toBe(false);
        });
        test.each([1, 2, 100])("a positive-delay interval should not fire", (delay) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let intervalCalled = false;
          sut.scheduler.setInterval(() => {
            intervalCalled = true;
          }, delay);
          expect(intervalCalled).toBe(false);
        });
      });
    });
  });
}
