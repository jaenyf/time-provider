import { expect, test, describe, beforeEach, afterEach, vi } from "vite-plus/test";
import type { IClock, IPlugin, IUtcOnlyPlugin } from "@time-provider/core";
import { testParser } from "./testParser.ts";

export function testSystemRuntime<TDate>(
  plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>,
  parseTime: (initialValue: string | number | TDate) => TDate,
) {
  const createSystemRuntime = () => plugin.createSystemRuntime();

  describe("createSystemRuntime", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createSystemRuntime()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createSystemRuntime()).toBe("object");
    });
  });

  describe("system", () => {
    describe.skipIf(!plugin.supportsLocalTime)("localNow", () => {
      test("doesn't throw", () => {
        const sut = createSystemRuntime();
        expect(() => (sut.clock as IClock<TDate>).localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSystemRuntime();
        expect((sut.clock as IClock<TDate>).localNow()).not.toEqual(undefinedValue);
      });
    });

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createSystemRuntime();
        expect(() => sut.clock.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSystemRuntime();
        expect(sut.clock.utcNow()).not.toEqual(undefinedValue);
      });
    });

    describe("parser", () => {
      testParser(() => plugin.createSystemRuntime().parser, parseTime);
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
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setTimeout(callback);
          vi.advanceTimersByTime(4);
          expect(callbackCalled).toBe(true);
        });
        test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setTimeout(callback, immediateDelay);
          vi.advanceTimersByTime(1000);
          expect(callbackCalled).toBe(true);
        });
        test.each([1, 20, 100])("ignore future callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setTimeout(callback, futureDelay * 2);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
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
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setInterval(callback);
          vi.advanceTimersByTime(4);
          expect(callbackCalled).toBe(true);
        });
        test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setInterval(callback, immediateDelay);
          vi.advanceTimersByTime(1000);
          expect(callbackCalled).toBe(true);
        });
        test.each([1, 20, 100])("ignore future callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setInterval(callback, futureDelay * 2);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
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
            const sut = plugin.createSystemRuntime();
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
