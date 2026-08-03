import type {
  DueHandle,
  ISystemPlugin,
  IUtcOnlySystemPlugin,
  TimezoneDefinition,
} from "@time-provider/core";
import { describe, beforeEach, vi, afterEach, test, expect } from "vite-plus/test";
import {
  testConstructorArgs,
  testLocalNow,
  testWithTimezone,
  testUtcNow,
  testTimestampNow,
} from "./helpers/testHelpers.ts";
import { testParser } from "./helpers/testParser.ts";
import { testPerformance } from "./helpers/testPerformance.ts";

export function testSystemRuntime<TDate>(
  plugin: ISystemPlugin<TDate> | IUtcOnlySystemPlugin<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  const createSystemRuntime = (timezone: TimezoneDefinition) =>
    plugin.supportsLocalTime ? plugin.createSystemRuntime(timezone) : plugin.createSystemRuntime();
  const createSUT = () => createSystemRuntime("Pacific/Kiritimati");

  testConstructorArgs("createSystemRuntime", createSUT);

  describe("system", () => {
    testLocalNow(plugin.supportsLocalTime, createSUT);
    testWithTimezone<TDate>(plugin.supportsLocalTime, createSUT);
    testUtcNow(createSUT);
    testTimestampNow(createSUT);

    describe("parser", () => {
      testParser(
        plugin.supportsLocalTime,
        () => createSUT().parser,
        parseTimeToUtc,
        parseTimeToLocal,
      );
    });

    describe("scheduler", () => {
      describe("setTimeout", async () => {
        beforeEach(async () => {
          vi.useFakeTimers();
        });
        afterEach(async () => {
          vi.useRealTimers();
        });
        test("can be called without specified delay", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setTimeout(callback);
          vi.advanceTimersByTime(4);
          expect(callbackCalled).toBe(true);
        });
        test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setTimeout(callback, immediateDelay);
          vi.advanceTimersByTime(1000);
          expect(callbackCalled).toBe(true);
        });
        test.each([1, 20, 100])("ignore future callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setTimeout(callback, futureDelay * 2);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackACalled = false;
          const callbackA = () => (callbackACalled = true);
          let callbackBCalled = false;
          const callbackB = () => (callbackBCalled = true);
          const timeoutHandleA = sut.setTimeout(callbackA, futureDelay);
          const timeoutHandleB = sut.setTimeout(callbackB, futureDelay);
          sut.clearTimeout(timeoutHandleA);
          sut.clearTimeout(timeoutHandleB);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackACalled).toBe(false);
          expect(callbackBCalled).toBe(false);
        });
        describe("issue#120", () => {
          test.each([undefined, null])(
            "does not throw when clearing an undefined or null handle",
            (undefinedHandle) => {
              const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
              expect(() => sut.clearTimeout(undefinedHandle as never)).not.toThrow();
            },
          );
        });
        test("clearing a timeout via clearInterval/clearRecurring does not cancel it", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let called = false;
          const handle = sut.setTimeout(() => (called = true), 10);
          expect(() => sut.clearInterval(handle)).not.toThrow();
          expect(() => sut.clearRecurring(handle)).not.toThrow();
          vi.advanceTimersByTime(10);
          expect(called).toBe(true);
        });
      });

      describe("setInterval", async () => {
        beforeEach(async () => {
          vi.useFakeTimers();
        });
        afterEach(async () => {
          vi.useRealTimers();
        });
        test("can be called without specified delay", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setInterval(callback);
          vi.advanceTimersByTime(4);
          expect(callbackCalled).toBe(true);
        });
        test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setInterval(callback, immediateDelay);
          vi.advanceTimersByTime(1000);
          expect(callbackCalled).toBe(true);
        });
        test.each([1, 20, 100])("ignore future callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setInterval(callback, futureDelay * 2);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackACalled = false;
          const callbackA = () => (callbackACalled = true);
          let callbackBCalled = false;
          const callbackB = () => (callbackBCalled = true);
          const timeoutHandleA = sut.setInterval(callbackA, futureDelay);
          const timeoutHandleB = sut.setInterval(callbackB, futureDelay);
          sut.clearInterval(timeoutHandleA);
          sut.clearInterval(timeoutHandleB);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackACalled).toBe(false);
          expect(callbackBCalled).toBe(false);
        });
        test.each([3, 30, 300])(
          "runs callbacks multiple times if time advance consequently",
          (expectedRetries: number) => {
            const sut = plugin.createSystemRuntime("Pacific/Kiritimati");
            let retries = 0;
            sut.scheduler.setInterval(() => {
              retries++;
            }, 1000);
            vi.advanceTimersByTime(expectedRetries * 1000);
            expect(retries).toBe(expectedRetries);
          },
        );
        describe("issue#120", () => {
          test.each([undefined, null])(
            "does not throw when clearing an undefined or null handle",
            (undefinedHandle) => {
              const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
              expect(() => sut.clearInterval(undefinedHandle as never)).not.toThrow();
            },
          );
        });
        test("clearing an interval via clearTimeout/clearRecurring does not cancel it", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callCount = 0;
          const handle = sut.setInterval(() => callCount++, 10);
          expect(() => sut.clearTimeout(handle)).not.toThrow();
          expect(() => sut.clearRecurring(handle)).not.toThrow();
          vi.advanceTimersByTime(25);
          expect(callCount).toBe(2);
          sut.clearInterval(handle);
        });
      });

      describe("setRecurring", async () => {
        beforeEach(async () => {
          vi.useFakeTimers();
        });
        afterEach(async () => {
          vi.useRealTimers();
        });
        test.each([1, 20, 100])(
          "executes next callback when time advance",
          (futureDelay: number) => {
            const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
            let callbackCalled = false;
            sut.setRecurring(() => {
              callbackCalled = true;
              return false;
            }, futureDelay);
            vi.advanceTimersByTime(futureDelay);
            expect(callbackCalled).toBe(true);
          },
        );
        test.each([1, 20, 100])("ignore future callback", (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackCalled = false;
          sut.setRecurring(() => {
            callbackCalled = true;
            return false;
          }, futureDelay * 2);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callbackACalled = false;
          let callbackBCalled = false;
          const handleA = sut.setRecurring(() => {
            callbackACalled = true;
            return false;
          }, futureDelay);
          const handleB = sut.setRecurring(() => {
            callbackBCalled = true;
            return false;
          }, futureDelay);
          sut.clearRecurring(handleA);
          sut.clearRecurring(handleB);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackACalled).toBe(false);
          expect(callbackBCalled).toBe(false);
        });
        test("stops once callback returns false, instead of continuing to recur", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let runs = 0;
          sut.setRecurring(() => {
            runs++;
            return runs < 3 ? 10 : false;
          }, 10);
          vi.advanceTimersByTime(1000);
          expect(runs).toBe(3);
        });
        test("recomputes a fresh delay before every run", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          const delays = [10, 5, 1];
          let calls = 1; // delays[0] is consumed as the initial delay below
          let runs = 0;
          sut.setRecurring(() => {
            runs++;
            return calls < delays.length ? delays[calls++] : false;
          }, delays[0]);
          vi.advanceTimersByTime(16);
          expect(runs).toBe(3);
        });
        describe("issue#131", () => {
          test("does not invoke recurring B if recurring A cancels it during the same time advance", () => {
            const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
            let callbackBCallCount = 0;
            const recurringHandleB = sut.setRecurring(() => {
              callbackBCallCount++;
              return 20;
            }, 20);
            sut.setRecurring(() => {
              sut.clearRecurring(recurringHandleB);
              return false;
            }, 10);
            vi.advanceTimersByTime(30);
            expect(callbackBCallCount).toBe(0);
          });
          test("a clearRecurring reentrant to its own callback stops the schedule immediately", () => {
            const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
            let runs = 0;
            let handle: DueHandle;
            handle = sut.setRecurring(() => {
              runs++;
              sut.clearRecurring(handle);
              return 10;
            }, 10);
            vi.advanceTimersByTime(100);
            expect(runs).toBe(1);
          });
        });
        describe("issue#120", () => {
          test.each([undefined, null])(
            "does not throw when clearing an undefined or null handle",
            (undefinedHandle) => {
              const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
              expect(() => sut.clearRecurring(undefinedHandle as never)).not.toThrow();
            },
          );
        });
        test("clearing a recurring schedule via clearTimeout/clearInterval does not cancel it", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let runs = 0;
          const handle = sut.setRecurring(() => {
            runs++;
            return 10;
          }, 10);
          expect(() => sut.clearTimeout(handle)).not.toThrow();
          expect(() => sut.clearInterval(handle)).not.toThrow();
          vi.advanceTimersByTime(25);
          expect(runs).toBe(2);
          sut.clearRecurring(handle);
        });
        test("clearRecurring is not scoped to the runtime it's called through - native timers are process-global", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          const otherRuntime = plugin.createSystemRuntime("Pacific/Kiritimati").scheduler;
          let callCount = 0;
          const handle = sut.setRecurring(() => {
            callCount++;
            return 10;
          }, 10);
          /*
            Unlike the deterministic runtimes (each with its own private heap), System runtimes
            all share the one real native timer namespace - there's no per-runtime ownership to
            check, so clearing a handle through a *different* System runtime instance still
            cancels the real underlying timer, same as calling the global clearTimeout directly.
          */
          otherRuntime.clearRecurring(handle);
          vi.advanceTimersByTime(25);
          expect(callCount).toBe(0);
        });
      });
    });

    describe("performance", () => {
      testPerformance(createSUT, true);
    });
  });
}
