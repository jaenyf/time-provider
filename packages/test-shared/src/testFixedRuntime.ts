import { toDuration, type TimezoneDefinition } from "@time-provider/core";
import type {
  IDeterministicPlugin,
  IUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import { describe, test, expect } from "vite-plus/test";
import {
  testConstructorArgs,
  testLocalNow,
  testWithTimezone,
  testUtcNow,
  testTimestampNow,
  getDeterministicBuilderFor,
} from "./helpers/testHelpers.ts";
import { testParser } from "./helpers/testParser.ts";
import { testTimers } from "./helpers/testScheduler.ts";
import { testPerformance } from "./helpers/testPerformance.ts";
import { testAddonCronFixed } from "./helpers/testCron.ts";

export function testFixedRuntime<TDate>(
  plugin: IDeterministicPlugin<TDate> | IUtcOnlyDeterministicPlugin<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  const createFixedRuntime = (
    timezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ) =>
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
    testTimestampNow(createSUT);

    describe("parser", () => {
      testParser(
        plugin.supportsLocalTime,
        () => createSUT().parser,
        parseTimeToUtc,
        parseTimeToLocal,
      );
    });

    describe("timers", () => {
      testTimers(() => createSUT().timers, true);
      describe("issue#57", () => {
        //see: https://github.com/jaenyf/time-provider/issues/57
        test.each([0, -1, -100])(
          "a zero-or-negative-delay timeout should not fire",
          (delay: number) => {
            const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
            let timeoutCalled = false;
            sut.timers.once(toDuration({ milliseconds: delay }), () => {
              timeoutCalled = true;
            });
            expect(timeoutCalled).toBe(false);
          },
        );
        test.each([0, -1, -100])(
          "a zero-or-negative-delay interval should not fire",
          (delay: number) => {
            const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
            let intervalCalled = false;
            sut.timers.every(toDuration({ milliseconds: delay }), () => {
              intervalCalled = true;
            });
            expect(intervalCalled).toBe(false);
          },
        );
        test.each([1, 2, 100])("a positive-delay timeout should not fire", (delay: number) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let timeoutCalled = false;
          sut.timers.once(toDuration({ milliseconds: delay }), () => {
            timeoutCalled = true;
          });
          expect(timeoutCalled).toBe(false);
        });
        test.each([1, 2, 100])("a positive-delay interval should not fire", (delay: number) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let intervalCalled = false;
          sut.timers.every(toDuration({ milliseconds: delay }), () => {
            intervalCalled = true;
          });
          expect(intervalCalled).toBe(false);
        });
      });
    });

    describe("performance", () => {
      testPerformance(createSUT);
    });

    describe("addon-cron", () => {
      testAddonCronFixed(() => getDeterministicBuilderFor(plugin));
    });
  });
}
