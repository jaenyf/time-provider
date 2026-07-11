import { expect, test, describe } from "vite-plus/test";
import type { IPlugin } from "@time-provider/core";
import { testScheduler } from "./testScheduler.ts";

export function testManualRuntime<TDate>(
  plugin: IPlugin<TDate>,
  parseTime: (initialValue: string | number | TDate) => TDate,
) {
  const createSUT = () => plugin.createManualRuntime("2026-01-01T00:00:00.000Z");

  describe("createManualRuntime", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createSUT()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createSUT()).toBe("object");
    });
    test.each(["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"])(
      "can construct an object with a string",
      (isoTimeText: string) => {
        plugin.createManualRuntime(isoTimeText);
      },
    );
    test.each([0, 100])("can construct an object with a number", (milliseconds: number) => {
      plugin.createManualRuntime(milliseconds);
    });
    test("can construct an object with a TDate", () => {
      plugin.createManualRuntime(parseTime("2026-01-01T00:00:00.000Z"));
    });
  });

  describe("manual", () => {
    describe("localNow", () => {
      test("doesn't throw", () => {
        const sut = createSUT();
        expect(() => sut.localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSUT();
        expect(sut.localNow()).not.toEqual(undefinedValue);
      });
      test("returns a fixed value", () => {
        const sut = createSUT();
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:00.000Z"));
      });
    });

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createSUT();
        expect(() => sut.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSUT();
        expect(sut.utcNow()).not.toEqual(undefinedValue);
      });
      test("returns a fixed value", () => {
        const sut = createSUT();
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:00.000Z"));
      });
    });

    describe("parse", () => {
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(() => sut.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "returns a value",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(sut.parse(toParse)).not.toEqual(undefined);
          expect(sut.parse(toParse)).not.toEqual(null);
        },
      );
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(sut.parse(toParse)).toEqual(parseTime(toParse));
        },
      );
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
        expect(sut.utcNow()).toEqual(parseTime("2027-01-01T00:00:00.000Z"));
      });

      test("moves down years", () => {
        const sut = createSUT();
        sut.advance({ years: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-01-01T00:00:00.000Z"));
      });

      test("moves up months", () => {
        const sut = createSUT();
        sut.advance({ months: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-02-01T00:00:00.000Z"));
      });

      test("moves down months", () => {
        const sut = createSUT();
        sut.advance({ months: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-01T00:00:00.000Z"));
      });

      test("moves up days", () => {
        const sut = createSUT();
        sut.advance({ days: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-02T00:00:00.000Z"));
      });

      test("moves down days", () => {
        const sut = createSUT();
        sut.advance({ days: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T00:00:00.000Z"));
      });

      test("moves up hours", () => {
        const sut = createSUT();
        sut.advance({ hours: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T01:00:00.000Z"));
      });

      test("moves down hours", () => {
        const sut = createSUT();
        sut.advance({ hours: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T23:00:00.000Z"));
      });

      test("moves up minutes", () => {
        const sut = createSUT();
        sut.advance({ minutes: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:01:00.000Z"));
      });

      test("moves down minutes", () => {
        const sut = createSUT();
        sut.advance({ minutes: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T23:59:00.000Z"));
      });

      test("moves up seconds", () => {
        const sut = createSUT();
        sut.advance({ seconds: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
      });

      test("moves down seconds", () => {
        const sut = createSUT();
        sut.advance({ seconds: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T23:59:59.000Z"));
      });

      test("moves up milliseconds", () => {
        const sut = createSUT();
        sut.advance({ milliseconds: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:00.001Z"));
      });

      test("moves down milliseconds", () => {
        const sut = createSUT();
        sut.advance({ milliseconds: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T23:59:59.999Z"));
      });
    });

    describe("scheduler", () => {
      testScheduler(() => createSUT().scheduler);
      describe("additionnal", () => {
        test.each([1, 20, 100])(
          "executes next callbacks when time advance",
          (futureDelay: number) => {
            const sut = createSUT();
            let callbackACalled = false,
              callbackBCalled = false;
            const callbackA = () => (callbackACalled = true);
            const callbackB = () => (callbackBCalled = true);
            sut.setTimeout(futureDelay, callbackA);
            sut.setTimeout(futureDelay, callbackB);
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
            sut.setTimeout(futureDelay * 2, callbackA);
            sut.setTimeout(futureDelay * 2, callbackB);
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
            const timeoutHandleA = sut.setTimeout(futureDelay, callbackA);
            const timeoutHandleB = sut.setTimeout(futureDelay, callbackB);
            sut.clearTimeout(timeoutHandleA);
            sut.clearTimeout(timeoutHandleB);
            sut.advance({ milliseconds: futureDelay });
            expect(callbackACalled).toBe(false);
            expect(callbackBCalled).toBe(false);
          },
        );
      });
    });
  });
}
