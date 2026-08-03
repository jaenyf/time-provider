import { expect, test, describe } from "vite-plus/test";
import type { DueHandle, IClock, TimezoneDefinition } from "@time-provider/core";
import { testScheduler } from "./helpers/testScheduler.ts";
import { testParser } from "./helpers/testParser.ts";
import { testPerformance } from "./helpers/testPerformance.ts";
import { testConstructorArgs, testTimestampNow, testWithTimezone } from "./helpers/testHelpers.ts";
import type {
  IDeterministicPlugin,
  IUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";

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

    describe("scheduler", () => {
      testScheduler(() => createSUT().scheduler);
      describe("additionnal", () => {
        describe("setTimeout", () => {
          test("can be called without specified delay", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 1000]);
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.setTimeout(callback);
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
              sut.setTimeout(callbackA, futureDelay);
              sut.setTimeout(callbackB, futureDelay);
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
              sut.setTimeout(callbackA, futureDelay * 2);
              sut.setTimeout(callbackB, futureDelay * 2);
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
              const timeoutHandleA = sut.setTimeout(callbackA, futureDelay);
              const timeoutHandleB = sut.setTimeout(callbackB, futureDelay);
              sut.clearTimeout(timeoutHandleA);
              sut.clearTimeout(timeoutHandleB);
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
              sut.setTimeout(callbackA, futureDelay);
              sut.setTimeout(callbackB, futureDelay);
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
              sut.setTimeout(callbackA, futureDelay * 2);
              sut.setTimeout(callbackB, futureDelay * 2);
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
              const timeoutHandleA = sut.setTimeout(callbackA, futureDelay);
              const timeoutHandleB = sut.setTimeout(callbackB, futureDelay);
              sut.clearTimeout(timeoutHandleA);
              sut.clearTimeout(timeoutHandleB);
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
              const timeoutHandleB = sut.setTimeout(callbackB, 20);
              const callbackA = () => sut.clearTimeout(timeoutHandleB);
              sut.setTimeout(callbackA, 10);
              sut.clock.utcNow();
              sut.clock.utcNow();
              expect(callbackBCalled).toBe(false);
            });
          });
        });

        describe("setInterval", () => {
          test("can be called without specified delay", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 1000]);
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.setInterval(callback);
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
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
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
              sut.setInterval(callbackA, futureDelay * 2);
              sut.setInterval(callbackB, futureDelay * 2);
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
              const timeoutHandleA = sut.setInterval(callbackA, futureDelay);
              const timeoutHandleB = sut.setInterval(callbackB, futureDelay);
              sut.clearInterval(timeoutHandleA);
              sut.clearInterval(timeoutHandleB);
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
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
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
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
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
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
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
              sut.setInterval(callbackA, futureDelay * 2);
              sut.setInterval(callbackB, futureDelay * 2);
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
              const timeoutHandleA = sut.setInterval(callbackA, futureDelay);
              const timeoutHandleB = sut.setInterval(callbackB, futureDelay);
              sut.clearInterval(timeoutHandleA);
              sut.clearInterval(timeoutHandleB);
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
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
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
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
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
              sut.scheduler.setInterval(() => {
                retries++;
              }, 1000);
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
              sut.scheduler.setInterval(() => {
                retries++;
              }, 1000);
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
                sut.scheduler.setInterval(() => {
                  buffer += "A";
                }, 100);
                sut.scheduler.setInterval(() => {
                  buffer += "B";
                }, 150);
                (sut.clock as IClock<TDate>).localNow();
                (sut.clock as IClock<TDate>).localNow();
                expect(buffer).toBe("ABABAABABAABABAA");
              },
            );
            test("scatter callbacks run in a timely fashion instead of running them multiple time individually (utcNow)", () => {
              const sut = createSUT();
              let buffer: string = "";
              sut.scheduler.setInterval(() => {
                buffer += "A";
              }, 100);
              sut.scheduler.setInterval(() => {
                buffer += "B";
              }, 150);
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
                const intervalHandleB = sut.setInterval(callbackB, 20);
                const callbackA = () => sut.clearInterval(intervalHandleB);
                sut.setInterval(callbackA, 10);
                (sut.clock as IClock<TDate>).localNow();
                (sut.clock as IClock<TDate>).localNow();
                expect(callbackBCallCount).toBe(0);
              },
            );
            test("does not invoke interval B if interval A cancels it during the same time advance (utcNow)", () => {
              const sut = createSUT();
              let callbackBCallCount = 0;
              const callbackB = () => callbackBCallCount++;
              const intervalHandleB = sut.setInterval(callbackB, 20);
              const callbackA = () => sut.clearInterval(intervalHandleB);
              sut.setInterval(callbackA, 10);
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
              const handle = sut.setTimeout(() => (callbackCalled = true), 10);
              otherRuntime.clearTimeout(handle);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(callbackCalled).toBe(true);
            },
          );
          test("passing another runtime's handle does not cancel this runtime's timeout (utcNow)", () => {
            const sut = createSUT();
            const otherRuntime = createSUT();
            let callbackCalled = false;
            const handle = sut.setTimeout(() => (callbackCalled = true), 10);
            otherRuntime.clearTimeout(handle);
            sut.utcNow();
            sut.utcNow();
            expect(callbackCalled).toBe(true);
          });
          test("does not corrupt heap ordering when a short-delay interval is registered while another is pending (utcNow)", () => {
            const sut = createSUT();
            const order: string[] = [];
            sut.setInterval(() => order.push("A"), 500);
            sut.setInterval(() => order.push("B"), 300);
            sut.utcNow();
            sut.utcNow();
            expect(order.join(",")).toBe("B,A,B,B,A");
          });
          test.skipIf(!plugin.supportsLocalTime)(
            "does not corrupt heap ordering when a short-delay interval is registered while another is pending (localNow)",
            () => {
              const sut = createSUT();
              const order: string[] = [];
              sut.setInterval(() => order.push("A"), 500);
              sut.setInterval(() => order.push("B"), 300);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(order.join(",")).toBe("B,A,B,B,A");
            },
          );
          test("does not double-fire when the callback reentrantly advances time itself (utcNow)", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 100, 199]);
            let fireCount = 0;
            let reentered = false;
            sut.setInterval(() => {
              fireCount++;
              if (!reentered) {
                reentered = true;
                sut.utcNow();
              }
            }, 100);
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
              sut.setInterval(() => {
                fireCount++;
                if (!reentered) {
                  reentered = true;
                  (sut.clock as IClock<TDate>).localNow();
                }
              }, 100);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(fireCount).toBe(1);
            },
          );
          test("keeps correct tie-break order across a reentrant time advance from within a callback (utcNow)", () => {
            const sut = createSUT();
            const order: string[] = [];
            let reentered = false;
            sut.setInterval(() => {
              order.push("A");
              if (!reentered) {
                reentered = true;
                sut.utcNow();
              }
            }, 300);
            sut.setInterval(() => order.push("B"), 300);
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
              sut.setInterval(() => {
                order.push("A");
                if (!reentered) {
                  reentered = true;
                  (sut.clock as IClock<TDate>).localNow();
                }
              }, 300);
              sut.setInterval(() => order.push("B"), 300);
              (sut.clock as IClock<TDate>).localNow();
              (sut.clock as IClock<TDate>).localNow();
              expect(order.join(",")).toBe("A,B,A,B,A,B,A,B,A,B,A,B");
            },
          );
          test("passing another runtime's handle does not cancel this runtime's interval (utcNow)", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 25, 50]);
            const otherRuntime = createSequentialRuntime("Pacific/Kiritimati", [0, 25, 50]);
            let callCount = 0;
            const handle = sut.setInterval(() => callCount++, 10);
            otherRuntime.clearInterval(handle);
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
              const handle = sut.setInterval(() => callCount++, 10);
              otherRuntime.clearInterval(handle);
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
            const handles: DueHandle[] = [];
            const thresholdBeforeCompaction = compactionThreshold - 1;
            for (let i = 0; i < thresholdBeforeCompaction; i++) {
              handles.push(sut.setTimeout(() => fireCount++, compactionThreshold + i));
            }
            //clear the half of registered callbacks
            for (let i = 0; i < handles.length; i += 2) {
              sut.clearTimeout(handles[i]);
            }
            // this 1000th registration trips COMPACTION_INTERVAL and runs compact()
            sut.setTimeout(() => fireCount++, compactionThreshold * 2 - 2);
            //advance time
            sut.utcNow();
            sut.utcNow();
            expect(fireCount).toBe(compactionThreshold / 2);
          });
          test("compaction discards interval entries once it is triggered (utcNow)", () => {
            const sut = createSequentialRuntime("", [0, compactionThreshold * 2 - 2]);
            let fireCount = 0;
            const handles: DueHandle[] = [];
            const thresholdBeforeCompaction = compactionThreshold - 1;
            for (let i = 0; i < thresholdBeforeCompaction; i++) {
              handles.push(sut.setInterval(() => fireCount++, compactionThreshold + i));
            }
            //clear the half of registered callbacks
            for (let i = 0; i < handles.length; i += 2) {
              sut.clearInterval(handles[i]);
            }
            // the following setInterval call triggers compaction
            sut.setInterval(() => fireCount++, compactionThreshold * 2 - 2);
            //advance time
            sut.utcNow();
            sut.utcNow();
            expect(fireCount).toBe(compactionThreshold / 2);
          });
          test("clearing a non-root, non-last heap entry sifts the replacement up when it belongs higher (utcNow)", () => {
            const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 61]);
            const order: string[] = [];
            sut.setTimeout(() => order.push("1"), 1);
            sut.setTimeout(() => order.push("5"), 5);
            sut.setTimeout(() => order.push("2"), 2);
            const toClear = sut.setTimeout(() => order.push("50"), 50);
            sut.setTimeout(() => order.push("60"), 60);
            sut.setTimeout(() => order.push("3"), 3);
            sut.setTimeout(() => order.push("4"), 4);
            sut.clearTimeout(toClear);
            sut.utcNow();
            sut.utcNow();
            expect(order).toEqual(["1", "2", "3", "4", "5", "60"]);
          });
          test.skipIf(!plugin.supportsLocalTime)(
            "clearing a non-root, non-last heap entry sifts the replacement up when it belongs higher (localNow)",
            () => {
              const sut = createSequentialRuntime("Pacific/Kiritimati", [0, 61]);
              const order: string[] = [];
              sut.setTimeout(() => order.push("1"), 1);
              sut.setTimeout(() => order.push("5"), 5);
              sut.setTimeout(() => order.push("2"), 2);
              const toClear = sut.setTimeout(() => order.push("50"), 50);
              sut.setTimeout(() => order.push("60"), 60);
              sut.setTimeout(() => order.push("3"), 3);
              sut.setTimeout(() => order.push("4"), 4);
              sut.clearTimeout(toClear);
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
  });
}
