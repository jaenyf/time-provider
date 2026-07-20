import { expect, test, describe } from "vite-plus/test";
import type { IPlugin, IUtcOnlyPlugin, TimezoneDefinition } from "@time-provider/core";
import { testScheduler } from "./helpers/testScheduler.ts";
import { testParser } from "./helpers/testParser.ts";
import {
  testConstructorArgs,
  testWithLocalTimezone,
  testLocalNow,
  testUtcNow,
} from "./helpers/testHelpers.ts";

export function testManualRuntime<TDate>(
  plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  const createManualRuntime = (
    timezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ) =>
    plugin.supportsLocalTime
      ? plugin.createManualRuntime(timezone, initialTime)
      : plugin.createManualRuntime(initialTime);

  const createSUT = () => createManualRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");

  testConstructorArgs(
    "createManualRuntime",
    createSUT,
    (initialTime) => createManualRuntime("Pacific/Kiritimati", initialTime),
    parseTimeToUtc,
  );

  describe("manual", () => {
    testLocalNow(plugin.supportsLocalTime, createSUT, () =>
      parseTimeToLocal("2026-01-01T14:00+14:00"),
    );
    testWithLocalTimezone<TDate>(plugin.supportsLocalTime, createSUT);
    testUtcNow(createSUT, () => parseTimeToUtc("2026-01-01T00:00:00.000Z"));

    describe("parser", () => {
      testParser(plugin, parseTimeToUtc, parseTimeToLocal);
    });

    describe("advance", () => {
      test("returns itself", () => {
        const sut = createSUT();
        const instance = sut.advance({});
        expect(instance).toBe(sut);
      });

      test("moves up years", () => {
        const sut = createSUT();
        sut.advance({ years: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2027-01-01T00:00:00.000Z"));
      });

      test("moves down years", () => {
        const sut = createSUT();
        sut.advance({ years: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-01-01T00:00:00.000Z"));
      });

      test("moves up months", () => {
        const sut = createSUT();
        sut.advance({ months: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-02-01T00:00:00.000Z"));
      });

      test("moves down months", () => {
        const sut = createSUT();
        sut.advance({ months: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-01T00:00:00.000Z"));
      });

      test("moves up days", () => {
        const sut = createSUT();
        sut.advance({ days: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-02T00:00:00.000Z"));
      });

      test("moves down days", () => {
        const sut = createSUT();
        sut.advance({ days: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T00:00:00.000Z"));
      });

      test("moves up hours", () => {
        const sut = createSUT();
        sut.advance({ hours: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T01:00:00.000Z"));
      });

      test("moves down hours", () => {
        const sut = createSUT();
        sut.advance({ hours: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T23:00:00.000Z"));
      });

      test("moves up minutes", () => {
        const sut = createSUT();
        sut.advance({ minutes: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:01:00.000Z"));
      });

      test("moves down minutes", () => {
        const sut = createSUT();
        sut.advance({ minutes: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T23:59:00.000Z"));
      });

      test("moves up seconds", () => {
        const sut = createSUT();
        sut.advance({ seconds: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:01.000Z"));
      });

      test("moves down seconds", () => {
        const sut = createSUT();
        sut.advance({ seconds: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T23:59:59.000Z"));
      });

      test("moves up milliseconds", () => {
        const sut = createSUT();
        sut.advance({ milliseconds: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:00.001Z"));
      });

      test("moves down milliseconds", () => {
        const sut = createSUT();
        sut.advance({ milliseconds: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T23:59:59.999Z"));
      });

      describe("issue#56", () => {
        describe("atomicity (mixed-sign multi-field advance)", () => {
          test.each([
            ["days -> hours", { days: 1, hours: -48 }],
            ["hours -> milliseconds", { hours: 1, milliseconds: -7_200_000 }],
            ["milliseconds -> minutes", { milliseconds: 1, minutes: -1 }],
            ["minutes -> months", { minutes: 1, months: -1 }],
            ["months -> seconds", { months: 1, seconds: -3_000_000 }],
            ["seconds -> years", { seconds: 1, years: -1 }],
          ] as const)(
            "does not fire a timeout that isn't due given the final advanced time (%s)",
            (_label, advanceConfiguration) => {
              const sut = createSUT(); // 2026-01-01T00:00:00.000Z
              let callbackCount = 0;
              sut.scheduler.setTimeout(() => {
                ++callbackCount;
              }, 1);
              sut.advance(advanceConfiguration);
              expect(callbackCount).toBe(0);
            },
          );
          test.each([
            ["days -> hours", { days: 1, hours: -48 }],
            ["hours -> milliseconds", { hours: 1, milliseconds: -7_200_000 }],
            ["milliseconds -> minutes", { milliseconds: 1, minutes: -1 }],
            ["minutes -> months", { minutes: 1, months: -1 }],
            ["months -> seconds", { months: 1, seconds: -3_000_000 }],
            ["seconds -> years", { seconds: 1, years: -1 }],
          ] as const)(
            "does not fire an interval that isn't due given the final advanced time (%s)",
            (_label, advanceConfiguration) => {
              const sut = createSUT(); // 2026-01-01T00:00:00.000Z
              let callbackCount = 0;
              sut.scheduler.setInterval(() => {
                ++callbackCount;
              }, 1);
              sut.advance(advanceConfiguration);
              expect(callbackCount).toBe(0);
            },
          );
        });
      });
    });

    describe("scheduler", () => {
      testScheduler(() => createSUT().scheduler);
      describe("additionnal", () => {
        describe("setTimeout", () => {
          test("can be called without specified delay", () => {
            const sut = createSUT();
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.setTimeout(callback);
            sut.clock.utcNow();
            expect(callbackCalled).toBe(true);
          });
          test.each([1, 20, 100])(
            "executes next callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setTimeout(callbackA, futureDelay);
              sut.setTimeout(callbackB, futureDelay);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setTimeout(callbackA, futureDelay * 2);
              sut.setTimeout(callbackB, futureDelay * 2);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.setTimeout(callbackA, futureDelay);
              const timeoutHandleB = sut.setTimeout(callbackB, futureDelay);
              sut.clearTimeout(timeoutHandleA);
              sut.clearTimeout(timeoutHandleB);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
        });
        describe("setInterval", () => {
          test("can be called without specified delay", () => {
            const sut = createSUT();
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.setInterval(callback);
            sut.clock.utcNow();
            expect(callbackCalled).toBe(true);
          });
          test.each([1, 20, 100])(
            "executes next callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(callbackA, futureDelay * 2);
              sut.setInterval(callbackB, futureDelay * 2);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.setInterval(callbackA, futureDelay);
              const timeoutHandleB = sut.setInterval(callbackB, futureDelay);
              sut.clearInterval(timeoutHandleA);
              sut.clearInterval(timeoutHandleB);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "run next interval callbacks if delay has elapsed",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
              sut.advance({ milliseconds: futureDelay });
              callbackACalled = false;
              callbackBCalled = false;
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([2, 20, 100])(
            "ignore next interval callbacks if delay has not elapsed",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
              sut.advance({ milliseconds: futureDelay });
              callbackACalled = false;
              callbackBCalled = false;
              sut.advance({ milliseconds: futureDelay / 2 });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([3, 30, 300])(
            "runs callbacks multiple times if time advance consequently",
            (expectedRetries: number) => {
              const sut = createManualRuntime("Pacific/Kiritimati", 0);
              let retries = 0;
              sut.scheduler.setInterval(() => {
                retries++;
              }, 1000);
              sut.advance({
                seconds: expectedRetries,
              });
              expect(retries).toBe(expectedRetries);
            },
          );
        });
      });
    });
  });
}
