import { expect, test, describe } from "vite-plus/test";
import type { IClock, IPlugin, IUtcOnlyPlugin, TimezoneDefinition } from "@time-provider/core";
import { testScheduler } from "./helpers/testScheduler.ts";
import { testParser } from "./helpers/testParser.ts";
import { testConstructorArgs, testWithTimezone } from "./helpers/testHelpers.ts";

export function testSequentialRuntime<TDate>(
  plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>,
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
      testParser(plugin, parseTimeToUtc, parseTimeToLocal);
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
          test.each([3, 30, 300])(
            "runs callbacks multiple times if time advance consequently",
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
        });
      });
    });
  });
}
