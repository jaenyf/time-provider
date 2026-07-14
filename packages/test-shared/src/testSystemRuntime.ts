import { expect, test, describe, beforeEach, afterEach, vi } from "vite-plus/test";
import type { IPlugin } from "@time-provider/core";

export function testSystemRuntime<TDate>(
  plugin: IPlugin<TDate>,
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
    describe("localNow", () => {
      test("doesn't throw", () => {
        const sut = createSystemRuntime();
        expect(() => sut.localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSystemRuntime();
        expect(sut.localNow()).not.toEqual(undefinedValue);
      });
    });

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createSystemRuntime();
        expect(() => sut.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSystemRuntime();
        expect(sut.utcNow()).not.toEqual(undefinedValue);
      });
    });

    describe("parse", () => {
      test.each(["2026-01-01T00:00Z", 100, parseTime("2026-01-01T00:00Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createSystemRuntime();
          expect(() => sut.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00Z", 100, parseTime("2026-01-01T00:00Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createSystemRuntime();
          expect(sut.parse(toParse)).toEqual(parseTime(toParse));
        },
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
        test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setTimeout(immediateDelay, callback);
          vi.advanceTimersByTime(1000);
          expect(callbackCalled).toBe(true);
        });
        test.each([1, 20, 100])("ignore future callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setTimeout(futureDelay * 2, callback);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackACalled = false;
          const callbackA = () => (callbackACalled = true);
          let callbackBCalled = false;
          const callbackB = () => (callbackBCalled = true);
          const timeoutHandleA = sut.setTimeout(futureDelay, callbackA);
          const timeoutHandleB = sut.setTimeout(futureDelay, callbackB);
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
        test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setInterval(immediateDelay, callback);
          vi.advanceTimersByTime(1000);
          expect(callbackCalled).toBe(true);
        });
        test.each([1, 20, 100])("ignore future callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackCalled = false;
          const callback = () => (callbackCalled = true);
          sut.setInterval(futureDelay * 2, callback);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackCalled).toBe(false);
        });
        test.each([1, 20, 100])("ignore cleared callback", async (futureDelay: number) => {
          const sut = plugin.createSystemRuntime().scheduler;
          let callbackACalled = false;
          const callbackA = () => (callbackACalled = true);
          let callbackBCalled = false;
          const callbackB = () => (callbackBCalled = true);
          const timeoutHandleA = sut.setInterval(futureDelay, callbackA);
          const timeoutHandleB = sut.setInterval(futureDelay, callbackB);
          sut.clearInterval(timeoutHandleA);
          sut.clearInterval(timeoutHandleB);
          vi.advanceTimersByTime(futureDelay);
          expect(callbackACalled).toBe(false);
          expect(callbackBCalled).toBe(false);
        });
      });
    });
  });
}
