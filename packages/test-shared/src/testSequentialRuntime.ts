import { expect, test, describe } from "vite-plus/test";
import {
  type IScheduledHandle,
  type IClock,
  type TimezoneDefinition,
  asap,
} from "@time-provider/core";
import { testTimers } from "./helpers/testTimers.ts";
import { testParser } from "./helpers/testParser.ts";
import { testPerformance } from "./helpers/testPerformance.ts";
import {
  testConstructorArgs,
  testTimestampNow,
  testWithTimezone,
  getDeterministicBuilderFor,
} from "./helpers/testHelpers.ts";
import type {
  IDeterministicPlugin,
  IUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import { testAddonCronSequential } from "./helpers/testCron.ts";
import { testRuntime } from "./helpers/testRuntime.ts";

export function testSequentialRuntime<TDate>(
  plugin: IDeterministicPlugin<TDate> | IUtcOnlyDeterministicPlugin<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  const createSequentialRuntime = (
    timezone: TimezoneDefinition,
    sequentialTimes: (string | number | TDate)[],
  ) =>
    plugin.supportsLocalTime
      ? plugin.createSequentialRuntime(timezone, sequentialTimes)
      : plugin.createSequentialRuntime(sequentialTimes);

  const createSUT = () =>
    createSequentialRuntime("Pacific/Kiritimati", [
      "2026-01-01T00:00:01.000Z",
      "2026-01-01T00:00:02.000Z",
      "2026-01-01T00:00:03.000Z",
    ]);

  testRuntime(createSUT);
  testConstructorArgs(
    "createSequentialRuntime",
    createSUT,
    (initialTime) => createSequentialRuntime("Pacific/Kiritimati", [initialTime]),
    parseTimeToUtc,
  );

  describe("sequential", () => {
    testTimestampNow(createSUT);
    describe.skipIf(!plugin.supportsLocalTime)("localNow", () => {
      test("doesn't throw", () => {
        const sut = createSUT();
        expect(() => (sut.clock as IClock<TDate>).localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSUT();
        expect((sut.clock as IClock<TDate>).localNow()).not.toEqual(undefinedValue);
      });
      test("returns first added value", () => {
        const sut = createSUT();
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTimeToLocal("2026-01-01T14:00:01+14:00"),
        );
      });
      test("returns epoch time when no added value", () => {
        const sut = createSequentialRuntime("Pacific/Kiritimati", []);
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTimeToLocal("1970-01-01T14:00+14:00"),
        );
      });
      test("multiple calls returns sequentially defined times", () => {
        const sut = createSUT();
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTimeToLocal("2026-01-01T14:00:01+14:00"),
        );
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTimeToLocal("2026-01-01T14:00:02+14:00"),
        );
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTimeToLocal("2026-01-01T14:00:03+14:00"),
        );
      });
      test("overflowing calls returns last defined time", () => {
        const sut = createSequentialRuntime("Pacific/Kiritimati", ["2026-01-01T00:00Z"]);
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTimeToLocal("2026-01-01T14:00+14:00"),
        );
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTimeToLocal("2026-01-01T14:00+14:00"),
        );
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTimeToLocal("2026-01-01T14:00+14:00"),
        );
      });
    });

    testWithTimezone<TDate>(plugin.supportsLocalTime, createSUT);

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createSUT();
        expect(() => sut.clock.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSUT();
        expect(sut.clock.utcNow()).not.toEqual(undefinedValue);
      });
      test("returns first added value", () => {
        const sut = createSUT();
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:01.000Z"));
      });
      test("returns epoch time when no added value", () => {
        const sut = createSequentialRuntime("Pacific/Kiritimati", []);
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("1970-01-01T00:00:00.000Z"));
      });
      test("multiple calls returns sequentially defined times", () => {
        const sut = createSUT();
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:01.000Z"));
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:02.000Z"));
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:03.000Z"));
      });
      test("overflowing calls returns last defined time", () => {
        const sut = createSequentialRuntime("Pacific/Kiritimati", ["2026-01-01T00:00Z"]);
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00Z"));
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00Z"));
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00Z"));
      });
    });

    describe("parser", () => {
      testParser(
        plugin.supportsLocalTime,
        () => createSUT().parser,
        parseTimeToUtc,
        parseTimeToLocal,
      );
    });

    describe("timers", () => {
      testTimers(() => createSUT().timers);
      describe("additionnal", () => {
        describe("once", () => {
          test("can be called without specified delay", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 1000]);
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.once(asap(), callback);
            sut.clock.utcNow();
            expect(callbackCalled).toBe(true);
          });
          test.skipIf(!plugin.supportsLocalTime).each([2, 20, 100])(
            "executes next callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.once({ milliseconds: futureDelay }, callbackA);
              sut.once({ milliseconds: futureDelay }, callbackB);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.skipIf(!plugin.supportsLocalTime).each([1, 20, 100])(
            "ignore future callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay + 1,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.once({ milliseconds: futureDelay * 2 }, callbackA);
              sut.once({ milliseconds: futureDelay * 2 }, callbackB);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.skipIf(!plugin.supportsLocalTime).each([1, 20, 100])(
            "ignore cleared callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay * 2,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.once({ milliseconds: futureDelay }, callbackA);
              const timeoutHandleB = sut.once({ milliseconds: futureDelay }, callbackB);
              timeoutHandleA.dispose();
              timeoutHandleB.dispose();
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "executes next callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.once({ milliseconds: futureDelay }, callbackA);
              sut.once({ milliseconds: futureDelay }, callbackB);
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay + 1,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.once({ milliseconds: futureDelay * 2 }, callbackA);
              sut.once({ milliseconds: futureDelay * 2 }, callbackB);
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay * 2,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.once({ milliseconds: futureDelay }, callbackA);
              const timeoutHandleB = sut.once({ milliseconds: futureDelay }, callbackB);
              timeoutHandleA.dispose();
              timeoutHandleB.dispose();
              sut.clock.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          describe("issue#105", () => {
            test("does not invoke callback B if callback A cancels it during the same time advance", () => {
              const sut = createSUT();
              let callbackBCalled = false;
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleB = sut.once({ milliseconds: 20 }, callbackB);
              const callbackA = () => timeoutHandleB.dispose();
              sut.once({ milliseconds: 10 }, callbackA);
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(callbackBCalled).toBe(false);
            });
          });
        });

        describe("every", () => {
          test("can be called without specified delay", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 1000]);
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.every(asap(), callback);
            sut.clock.utcNow();
            expect(callbackCalled).toBe(true);
          });
          test.skipIf(!plugin.supportsLocalTime).each([2, 20, 100])(
            "executes next callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every({ milliseconds: futureDelay }, callbackA);
              sut.every({ milliseconds: futureDelay }, callbackB);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.skipIf(!plugin.supportsLocalTime).each([1, 20, 100])(
            "ignore future callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay + 1,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every({ milliseconds: futureDelay * 2 }, callbackA);
              sut.every({ milliseconds: futureDelay * 2 }, callbackB);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.skipIf(!plugin.supportsLocalTime).each([1, 20, 100])(
            "ignore cleared callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay * 2,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.every({ milliseconds: futureDelay }, callbackA);
              const timeoutHandleB = sut.every({ milliseconds: futureDelay }, callbackB);
              timeoutHandleA.dispose();
              timeoutHandleB.dispose();
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.skipIf(!plugin.supportsLocalTime).each([2, 20, 100])(
            "run next interval callbacks if delay has elapsed with localNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay * 2,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every({ milliseconds: futureDelay }, callbackA);
              sut.every({ milliseconds: futureDelay }, callbackB);
              (sut.clock as IClock<TDate>).localNow();
              callbackACalled = false;
              callbackBCalled = false;
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.skipIf(!plugin.supportsLocalTime).each([2, 20, 100])(
            "ignore next interval callbacks if delay has not elapsed with localNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay + 1,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every({ milliseconds: futureDelay }, callbackA);
              sut.every({ milliseconds: futureDelay }, callbackB);
              (sut.clock as IClock<TDate>).localNow();
              callbackACalled = false;
              callbackBCalled = false;
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "executes next callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every({ milliseconds: futureDelay }, callbackA);
              sut.every({ milliseconds: futureDelay }, callbackB);
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay + 1,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every({ milliseconds: futureDelay * 2 }, callbackA);
              sut.every({ milliseconds: futureDelay * 2 }, callbackB);
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay * 2,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.every({ milliseconds: futureDelay }, callbackA);
              const timeoutHandleB = sut.every({ milliseconds: futureDelay }, callbackB);
              timeoutHandleA.dispose();
              timeoutHandleB.dispose();
              sut.clock.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "run next interval callbacks if delay has elapsed with utcNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay * 2,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every({ milliseconds: futureDelay }, callbackA);
              sut.every({ milliseconds: futureDelay }, callbackB);
              sut.clock.utcNow();
              callbackACalled = false;
              callbackBCalled = false;
              sut.clock.utcNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([2, 20, 100])(
            "ignore next interval callbacks if delay has not elapsed with utcNow",
            (futureDelay: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                futureDelay,
                futureDelay + 1,
              ]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every({ milliseconds: futureDelay }, callbackA);
              sut.every({ milliseconds: futureDelay }, callbackB);
              sut.clock.utcNow();
              callbackACalled = false;
              callbackBCalled = false;
              sut.clock.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.skipIf(!plugin.supportsLocalTime).each([3, 30, 300])(
            "runs callbacks multiple times if time advance consequently with localNow",
            (expectedRetries: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                0,
                expectedRetries * 1000,
              ]);
              let retries = 0;
              sut.timers.every({ milliseconds: 1000 }, () => {
                retries++;
              });
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(retries).toBe(expectedRetries);
            },
          );
          test.each([3, 30, 300])(
            "runs callbacks multiple times if time advance consequently with utcNow",
            (expectedRetries: number) => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [
                0,
                expectedRetries * 1000,
              ]);
              let retries = 0;
              sut.timers.every({ milliseconds: 1000 }, () => {
                retries++;
              });
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(retries).toBe(expectedRetries);
            },
          );
          describe("issue#104", () => {
            test.skipIf(!plugin.supportsLocalTime)(
              "scatter callbacks run in a timely fashion instead of running them multiple time individually (localNow)",
              () => {
                const sut = createSUT();
                let buffer: string = "";
                sut.timers.every({ milliseconds: 100 }, () => {
                  buffer += "A";
                });
                sut.timers.every({ milliseconds: 150 }, () => {
                  buffer += "B";
                });
                (sut.clock as IClock<TDate>).localNow();
                (sut.clock as IClock<TDate>).localNow();
                expect(buffer).toBe("ABABAABABAABABAA");
              },
            );
            test("scatter callbacks run in a timely fashion instead of running them multiple time individually (utcNow)", () => {
              const sut = createSUT();
              let buffer: string = "";
              sut.timers.every({ milliseconds: 100 }, () => {
                buffer += "A";
              });
              sut.timers.every({ milliseconds: 150 }, () => {
                buffer += "B";
              });
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(buffer).toBe("ABABAABABAABABAA");
            });
          });
          describe("issue#105", () => {
            test.skipIf(!plugin.supportsLocalTime)(
              "does not invoke interval B if interval A cancels it during the same time advance (localNow)",
              () => {
                const sut = createSUT();
                let callbackBCallCount = 0;
                const callbackB = () => callbackBCallCount++;
                const intervalHandleB = sut.every({ milliseconds: 20 }, callbackB);
                const callbackA = () => intervalHandleB.dispose();
                sut.every({ milliseconds: 10 }, callbackA);
                (sut.clock as IClock<TDate>).localNow();
                (sut.clock as IClock<TDate>).localNow();
                expect(callbackBCallCount).toBe(0);
              },
            );
            test("does not invoke interval B if interval A cancels it during the same time advance (utcNow)", () => {
              const sut = createSUT();
              let callbackBCallCount = 0;
              const callbackB = () => callbackBCallCount++;
              const intervalHandleB = sut.every({ milliseconds: 20 }, callbackB);
              const callbackA = () => intervalHandleB.dispose();
              sut.every({ milliseconds: 10 }, callbackA);
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(callbackBCallCount).toBe(0);
            });
          });
          test.skipIf(!plugin.supportsLocalTime)(
            "passing another runtime's handle does not cancel this runtime's timeout (localNow)",
            () => {
              const sut = createSUT();
              const otherRuntime = createSUT();
              let callbackCalled = false;
              const handle = sut.once({ milliseconds: 10 }, () => (callbackCalled = true));
              //@ts-ignore : wrong type
              otherRuntime.clearTimer(handle);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackCalled).toBe(true);
            },
          );
          test("passing another runtime's handle does not cancel this runtime's timeout (utcNow)", () => {
            const sut = createSUT();
            const otherRuntime = createSUT();
            let callbackCalled = false;
            const handle = sut.once({ milliseconds: 10 }, () => (callbackCalled = true));
            //@ts-ignore : wrong type
            otherRuntime.clearTimer(handle);
            sut.utcNow();
            sut.utcNow();
            expect(callbackCalled).toBe(true);
          });
          test("does not corrupt heap ordering when a short-delay interval is registered while another is pending (utcNow)", () => {
            const sut = createSUT();
            const order: string[] = [];
            sut.every({ milliseconds: 500 }, () => order.push("A"));
            sut.every({ milliseconds: 300 }, () => order.push("B"));
            sut.utcNow();
            sut.utcNow();
            expect(order.join(",")).toBe("B,A,B,B,A");
          });
          test.skipIf(!plugin.supportsLocalTime)(
            "does not corrupt heap ordering when a short-delay interval is registered while another is pending (localNow)",
            () => {
              const sut = createSUT();
              const order: string[] = [];
              sut.every({ milliseconds: 500 }, () => order.push("A"));
              sut.every({ milliseconds: 300 }, () => order.push("B"));
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(order.join(",")).toBe("B,A,B,B,A");
            },
          );
          test("does not double-fire when the callback reentrantly advances time itself (utcNow)", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 100, 199]);
            let fireCount = 0;
            let reentered = false;
            sut.every({ milliseconds: 100 }, () => {
              fireCount++;
              if (!reentered) {
                reentered = true;
                sut.utcNow();
              }
            });
            sut.utcNow();
            sut.utcNow();
            expect(fireCount).toBe(1);
          });
          test.skipIf(!plugin.supportsLocalTime)(
            "does not double-fire when the callback reentrantly advances time itself (localNow)",
            () => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 100, 199]);
              let fireCount = 0;
              let reentered = false;
              sut.every({ milliseconds: 100 }, () => {
                fireCount++;
                if (!reentered) {
                  reentered = true;
                  (sut.clock as IClock<TDate>).localNow();
                }
              });
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(fireCount).toBe(1);
            },
          );
          test("keeps correct tie-break order across a reentrant time advance from within a callback (utcNow)", () => {
            const sut = createSUT();
            const order: string[] = [];
            let reentered = false;
            sut.every({ milliseconds: 300 }, () => {
              order.push("A");
              if (!reentered) {
                reentered = true;
                sut.utcNow();
              }
            });
            sut.every({ milliseconds: 300 }, () => order.push("B"));
            sut.utcNow();
            sut.utcNow();
            expect(order.join(",")).toBe("A,B,A,B,A,B,A,B,A,B,A,B");
          });
          test.skipIf(!plugin.supportsLocalTime)(
            "keeps correct tie-break order across a reentrant time advance from within a callback (localNow)",
            () => {
              const sut = createSUT();
              const order: string[] = [];
              let reentered = false;
              sut.every({ milliseconds: 300 }, () => {
                order.push("A");
                if (!reentered) {
                  reentered = true;
                  (sut.clock as IClock<TDate>).localNow();
                }
              });
              sut.every({ milliseconds: 300 }, () => order.push("B"));
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(order.join(",")).toBe("A,B,A,B,A,B,A,B,A,B,A,B");
            },
          );
          test("passing another runtime's handle does not cancel this runtime's interval (utcNow)", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 25, 50]);
            const otherRuntime = createSequentialRuntime("Pacific/Kiritimati", [0, 25, 50]);
            let callCount = 0;
            const handle = sut.every({ milliseconds: 10 }, () => callCount++);
            //@ts-ignore: wrong type
            otherRuntime.clearTimer(handle);
            sut.utcNow();
            sut.utcNow();
            expect(callCount).toBe(2);
          });
          test.skipIf(!plugin.supportsLocalTime)(
            "passing another runtime's handle does not cancel this runtime's interval (localNow)",
            () => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 25, 50]);
              const otherRuntime = createSequentialRuntime("Pacific/Kiritimati", [0, 25, 50]);
              let callCount = 0;
              const handle = sut.every({ milliseconds: 10 }, () => callCount++);
              //@ts-ignore: wrong type
              otherRuntime.clearTimer(handle);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(callCount).toBe(2);
            },
          );
        });
        describe("runtime heap", () => {
          const compactionThreshold = 1000;
          test("compaction discards timeout entries once it is triggered (utcNow)", () => {
            const sut = createSequentialRuntime("", [0, compactionThreshold * 2 - 2]);
            let fireCount = 0;
            const handles: IScheduledHandle[] = [];
            const thresholdBeforeCompaction = compactionThreshold - 1;
            for (let i = 0; i < thresholdBeforeCompaction; i++) {
              handles.push(sut.once({ milliseconds: compactionThreshold + i }, () => fireCount++));
            }
            //clear the half of registered callbacks
            for (let i = 0; i < handles.length; i += 2) {
              handles[i].dispose();
            }
            // this 1000th registration trips COMPACTION_INTERVAL and runs compact()
            sut.once({ milliseconds: compactionThreshold * 2 - 2 }, () => fireCount++);
            //advance time
            sut.utcNow();
            sut.utcNow();
            expect(fireCount).toBe(compactionThreshold / 2);
          });
          test("compaction discards interval entries once it is triggered (utcNow)", () => {
            const sut = createSequentialRuntime("", [0, compactionThreshold * 2 - 2]);
            let fireCount = 0;
            const handles: IScheduledHandle[] = [];
            const thresholdBeforeCompaction = compactionThreshold - 1;
            for (let i = 0; i < thresholdBeforeCompaction; i++) {
              handles.push(sut.every({ milliseconds: compactionThreshold + i }, () => fireCount++));
            }
            //clear the half of registered callbacks
            for (let i = 0; i < handles.length; i += 2) {
              handles[i].dispose();
            }
            // the following every call triggers compaction
            sut.every({ milliseconds: compactionThreshold * 2 - 2 }, () => fireCount++);
            //advance time
            sut.utcNow();
            sut.utcNow();
            expect(fireCount).toBe(compactionThreshold / 2);
          });
          test("clearing a non-root, non-last heap entry sifts the replacement up when it belongs higher (utcNow)", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 61]);
            const order: string[] = [];
            sut.once({ milliseconds: 1 }, () => order.push("1"));
            sut.once({ milliseconds: 5 }, () => order.push("5"));
            sut.once({ milliseconds: 2 }, () => order.push("2"));
            const toClear = sut.once({ milliseconds: 50 }, () => order.push("50"));
            sut.once({ milliseconds: 60 }, () => order.push("60"));
            sut.once({ milliseconds: 3 }, () => order.push("3"));
            sut.once({ milliseconds: 4 }, () => order.push("4"));
            toClear.dispose();
            sut.utcNow();
            sut.utcNow();
            expect(order).toEqual(["1", "2", "3", "4", "5", "60"]);
          });
          test.skipIf(!plugin.supportsLocalTime)(
            "clearing a non-root, non-last heap entry sifts the replacement up when it belongs higher (localNow)",
            () => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 61]);
              const order: string[] = [];
              sut.once({ milliseconds: 1 }, () => order.push("1"));
              sut.once({ milliseconds: 5 }, () => order.push("5"));
              sut.once({ milliseconds: 2 }, () => order.push("2"));
              const toClear = sut.once({ milliseconds: 50 }, () => order.push("50"));
              sut.once({ milliseconds: 60 }, () => order.push("60"));
              sut.once({ milliseconds: 3 }, () => order.push("3"));
              sut.once({ milliseconds: 4 }, () => order.push("4"));
              toClear.dispose();
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(order).toEqual(["1", "2", "3", "4", "5", "60"]);
            },
          );
        });
      });
    });

    describe("performance", () => {
      testPerformance(createSUT);

      test("reads do not consume the sequential timestamps", () => {
        const sut = createSUT();
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:01.000Z"));
        sut.performance.now();
        sut.performance.mark("m");
        sut.performance.measure("measure", "m");
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:02.000Z"));
        sut.performance.now();
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:03.000Z"));
      });
      test("now() falls back to 0 when no sequential time is configured", () => {
        const sut = createSequentialRuntime("Pacific/Kiritimati", []);
        expect(sut.performance.now()).toBe(0);
      });
    });

    describe("addon-cron", () => {
      testAddonCronSequential(() => getDeterministicBuilderFor(plugin));
    });
  });
}
