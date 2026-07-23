import type { ISystemPlugin, IUtcOnlySystemPlugin, TimezoneDefinition } from "@time-provider/core";
import { describe, beforeEach, vi, afterEach, test, expect } from "vite-plus/test";
import {
  testConstructorArgs,
  testLocalNow,
  testWithTimezone,
  testUtcNow,
} from "./helpers/testHelpers.ts";
import { testParser } from "./helpers/testParser.ts";
// ...
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
      });
    });
  });
}
