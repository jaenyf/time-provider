import {
  type ITimerHandle,
  type ISystemPlugin,
  type IUtcOnlySystemPlugin,
  type TimezoneDefinition,
  asap,
  toDuration,
  type DurationMilliseconds,
} from "@time-provider/core";
import { describe, beforeEach, vi, afterEach, test, expect } from "vite-plus/test";
import {
  testConstructorArgs,
  testLocalNow,
  testWithTimezone,
  testUtcNow,
  testTimestampNow,
  getBuilderFor,
} from "./helpers/testHelpers.ts";
import { testParser } from "./helpers/testParser.ts";
import { testPerformance } from "./helpers/testPerformance.ts";
import { testAddonCronSystem } from "./helpers/testCron.ts";

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

    describe("timers", () => {
      describe("once", async () => {
        beforeEach(async () => {
          vi.useFakeTimers();
        });
        afterEach(async () => {
          vi.useRealTimers();
        });
        test("can be called without specified delay", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.once(asap(), callback);
          vi.advanceTimersByTime(4);
          expect(callbackCalled).toBe(true);
        });
        test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.once(toDuration({ milliseconds: immediateDelay }), callback);
          vi.advanceTimersByTime(1000);
          expect(callbackCalled).toBe(true);
        });
        test.each([1, 20, 100])("ignore future callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.once(toDuration({ milliseconds: futureDelay * 2 }), callback);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackACalled = false;
          const callbackA = () => (callbackACalled = true);
          let callbackBCalled = false;
          const callbackB = () => (callbackBCalled = true);
          const timeoutHandleA = sut.once(toDuration({ milliseconds: futureDelay }), callbackA);
          const timeoutHandleB = sut.once(toDuration({ milliseconds: futureDelay }), callbackB);
          timeoutHandleA.dispose();
          timeoutHandleB.dispose();
          vi.advanceTimersByTime(futureDelay);
          expect(callbackACalled).toBe(false);
          expect(callbackBCalled).toBe(false);
        });
      });

      describe("every", async () => {
        beforeEach(async () => {
          vi.useFakeTimers();
        });
        afterEach(async () => {
          vi.useRealTimers();
        });
        test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.every(toDuration({ milliseconds: immediateDelay }), callback);
          vi.advanceTimersByTime(1000);
          expect(callbackCalled).toBe(true);
        });
        test.each([1, 20, 100])("ignore future callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.every(toDuration({ milliseconds: futureDelay * 2 }), callback);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackACalled = false;
          const callbackA = () => (callbackACalled = true);
          let callbackBCalled = false;
          const callbackB = () => (callbackBCalled = true);
          const timeoutHandleA = sut.every(toDuration({ milliseconds: futureDelay }), callbackA);
          const timeoutHandleB = sut.every(toDuration({ milliseconds: futureDelay }), callbackB);
          timeoutHandleA.dispose();
          timeoutHandleB.dispose();
          vi.advanceTimersByTime(futureDelay);
          expect(callbackACalled).toBe(false);
          expect(callbackBCalled).toBe(false);
        });
        test.each([3, 30, 300])(
          "runs callbacks multiple times if time advance consequently",
          (expectedRetries: number) => {
            const sut = plugin.createSystemRuntime("Pacific/Kiritimati");
            let retries = 0;
            sut.timers.every(toDuration({ milliseconds: 1000 }), () => {
              retries++;
            });
            vi.advanceTimersByTime(expectedRetries * 1000);
            expect(retries).toBe(expectedRetries);
          },
        );
      });

      describe("recurring", async () => {
        beforeEach(async () => {
          vi.useFakeTimers();
        });
        afterEach(async () => {
          vi.useRealTimers();
        });
        test.each([1, 20, 100])(
          "executes next callback when time advance",
          (futureDelay: number) => {
            const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
            let callbackCalled = false;
            sut.recurring(
              () => {
                callbackCalled = true;
                return false;
              },
              toDuration({ milliseconds: futureDelay }),
            );
            vi.advanceTimersByTime(futureDelay);
            expect(callbackCalled).toBe(true);
          },
        );
        test.each([1, 20, 100])("ignore future callback", (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackCalled = false;
          sut.recurring(
            () => {
              callbackCalled = true;
              return false;
            },
            toDuration({ milliseconds: futureDelay * 2 }),
          );
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", (futureDelay: number) => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let callbackACalled = false;
          let callbackBCalled = false;
          const handleA = sut.recurring(
            () => {
              callbackACalled = true;
              return false;
            },
            toDuration({ milliseconds: futureDelay }),
          );
          const handleB = sut.recurring(
            () => {
              callbackBCalled = true;
              return false;
            },
            toDuration({ milliseconds: futureDelay }),
          );
          handleA.dispose();
          handleB.dispose();
          vi.advanceTimersByTime(futureDelay);
          expect(callbackACalled).toBe(false);
          expect(callbackBCalled).toBe(false);
        });
        test("stops once callback returns false, instead of continuing to recur", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          let runs = 0;
          sut.recurring(() => {
            runs++;
            return runs < 3 ? (10 as DurationMilliseconds) : false;
          }, 10 as DurationMilliseconds);
          vi.advanceTimersByTime(1000);
          expect(runs).toBe(3);
        });
        test("recomputes a fresh delay before every run", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          const delays = [10, 5, 1];
          let calls = 1; // delays[0] is consumed as the initial delay below
          let runs = 0;
          sut.recurring(
            () => {
              runs++;
              return calls < delays.length ? toDuration({ milliseconds: delays[calls++] }) : false;
            },
            toDuration({ milliseconds: delays[0] }),
          );
          vi.advanceTimersByTime(16);
          expect(runs).toBe(3);
        });
        describe("issue#131", () => {
          test("does not invoke recurring B if recurring A cancels it during the same time advance", () => {
            const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
            let callbackBCallCount = 0;
            const recurringHandleB = sut.recurring(
              () => {
                callbackBCallCount++;
                return toDuration({ milliseconds: 20 });
              },
              toDuration({ milliseconds: 20 }),
            );
            sut.recurring(
              () => {
                recurringHandleB.dispose();
                return false;
              },
              toDuration({ milliseconds: 10 }),
            );
            vi.advanceTimersByTime(30);
            expect(callbackBCallCount).toBe(0);
          });
          test("a clearRecurring reentrant to its own callback stops the schedule immediately", () => {
            const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
            let runs = 0;
            let handle: ITimerHandle;
            handle = sut.recurring(() => {
              runs++;
              handle.dispose();
              return 10 as DurationMilliseconds;
            }, 10 as DurationMilliseconds);
            vi.advanceTimersByTime(100);
            expect(runs).toBe(1);
          });
        });
        test("clearing a recurring handle is not scoped to the runtime it's called through - native timers are process-global", () => {
          const sut = plugin.createSystemRuntime("Pacific/Kiritimati").timers;
          const otherRuntime = plugin.createSystemRuntime("Pacific/Kiritimati");
          let callCount = 0;
          const handle = sut.recurring(
            () => {
              callCount++;
              return toDuration({ milliseconds: 10 });
            },
            toDuration({ milliseconds: 10 }),
          );
          /*
            Unlike the deterministic runtimes (each with its own private heap), System runtimes
            all share the one real native timer namespace - there's no per-runtime ownership to
            check, so clearing a handle through a *different* System runtime instance still
            cancels the real underlying timer, same as calling the global clearTimeout directly.
          */
          //@ts-ignore : wrong type
          otherRuntime.clearTimer(handle);
          vi.advanceTimersByTime(25);
          expect(callCount).toBe(0);
        });
      });
    });

    describe("performance", () => {
      testPerformance(createSUT, true);
    });

    describe("addon-cron", () => {
      testAddonCronSystem(() => getBuilderFor(plugin));
    });
  });
}
