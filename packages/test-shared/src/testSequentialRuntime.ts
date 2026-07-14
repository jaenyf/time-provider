import { expect, test, describe } from "vite-plus/test";
import type { IPlugin } from "@time-provider/core";
import { testScheduler } from "./testScheduler.ts";

export function testSequentialRuntime<TDate>(
  plugin: IPlugin<TDate>,
  parseTime: (initialValue: string | number | TDate) => TDate,
) {
  const createSUT = () =>
    plugin.createSequentialRuntime([
      "2026-01-01T00:00:01.000Z",
      "2026-01-01T00:00:02.000Z",
      "2026-01-01T00:00:03.000Z",
    ]);

  describe("createSequentialRuntime", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createSUT()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createSUT()).toBe("object");
    });
    test.each(["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"])(
      "can construct an object with a string",
      (isoTimeText: string) => {
        plugin.createSequentialRuntime([isoTimeText]);
      },
    );
    test.each([0, 100])("can construct an object with a number", (milliseconds: number) => {
      plugin.createSequentialRuntime([milliseconds]);
    });
    test("can construct an object with a TDate", () => {
      plugin.createSequentialRuntime([parseTime("2026-01-01T00:00:00.000Z")]);
    });
  });

  describe("sequential", () => {
    describe("localNow", () => {
      test("doesn't throw", () => {
        const sut = createSUT();
        expect(() => sut.localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSUT();
        expect(sut.localNow()).not.toEqual(undefinedValue);
      });
      test("returns first added value", () => {
        const sut = createSUT();
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
      });
      test("returns epoch time when no added value", () => {
        const sut = plugin.createSequentialRuntime([]);
        expect(sut.localNow()).toEqual(parseTime("1970-01-01T00:00:00.000Z"));
      });
      test("multiple calls returns sequentially defined times", () => {
        const sut = createSUT();
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:02.000Z"));
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:03.000Z"));
      });
      test("overflowing calls returns last defined time", () => {
        const sut = plugin.createSequentialRuntime(["2026-01-01T00:00Z"]);
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00Z"));
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00Z"));
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00Z"));
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
      test("returns first added value", () => {
        const sut = createSUT();
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
      });
      test("returns epoch time when no added value", () => {
        const sut = plugin.createSequentialRuntime([]);
        expect(sut.utcNow()).toEqual(parseTime("1970-01-01T00:00:00.000Z"));
      });
      test("multiple calls returns sequentially defined times", () => {
        const sut = createSUT();
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:02.000Z"));
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:03.000Z"));
      });
      test("overflowing calls returns last defined time", () => {
        const sut = plugin.createSequentialRuntime(["2026-01-01T00:00Z"]);
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00Z"));
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00Z"));
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00Z"));
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

    describe("scheduler", () => {
      testScheduler(() => createSUT().scheduler);
      describe("additionnal", () => {
        describe("setTimeout", () => {
          test.each([2, 20, 100])(
            "executes next callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setTimeout(futureDelay, callbackA);
              sut.setTimeout(futureDelay, callbackB);
              sut.localNow();
              sut.localNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setTimeout(futureDelay * 2, callbackA);
              sut.setTimeout(futureDelay * 2, callbackB);
              sut.localNow();
              sut.localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.setTimeout(futureDelay, callbackA);
              const timeoutHandleB = sut.setTimeout(futureDelay, callbackB);
              sut.clearTimeout(timeoutHandleA);
              sut.clearTimeout(timeoutHandleB);
              sut.localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "executes next callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setTimeout(futureDelay, callbackA);
              sut.setTimeout(futureDelay, callbackB);
              sut.utcNow();
              sut.utcNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setTimeout(futureDelay * 2, callbackA);
              sut.setTimeout(futureDelay * 2, callbackB);
              sut.utcNow();
              sut.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.setTimeout(futureDelay, callbackA);
              const timeoutHandleB = sut.setTimeout(futureDelay, callbackB);
              sut.clearTimeout(timeoutHandleA);
              sut.clearTimeout(timeoutHandleB);
              sut.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
        });

        describe("setInterval", () => {
          test.each([2, 20, 100])(
            "executes next callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(futureDelay, callbackA);
              sut.setInterval(futureDelay, callbackB);
              sut.localNow();
              sut.localNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(futureDelay * 2, callbackA);
              sut.setInterval(futureDelay * 2, callbackB);
              sut.localNow();
              sut.localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.setInterval(futureDelay, callbackA);
              const timeoutHandleB = sut.setInterval(futureDelay, callbackB);
              sut.clearInterval(timeoutHandleA);
              sut.clearInterval(timeoutHandleB);
              sut.localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "run next interval callbacks if delay has elapsed with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(futureDelay, callbackA);
              sut.setInterval(futureDelay, callbackB);
              sut.localNow();
              callbackACalled = false;
              callbackBCalled = false;
              sut.localNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([2, 20, 100])(
            "ignore next interval callbacks if delay has not elapsed with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(futureDelay, callbackA);
              sut.setInterval(futureDelay, callbackB);
              sut.localNow();
              callbackACalled = false;
              callbackBCalled = false;
              sut.localNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "executes next callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(futureDelay, callbackA);
              sut.setInterval(futureDelay, callbackB);
              sut.utcNow();
              sut.utcNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(futureDelay * 2, callbackA);
              sut.setInterval(futureDelay * 2, callbackB);
              sut.utcNow();
              sut.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance with utcNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.setInterval(futureDelay, callbackA);
              const timeoutHandleB = sut.setInterval(futureDelay, callbackB);
              sut.clearInterval(timeoutHandleA);
              sut.clearInterval(timeoutHandleB);
              sut.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "run next interval callbacks if delay has elapsed with utcNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(futureDelay, callbackA);
              sut.setInterval(futureDelay, callbackB);
              sut.utcNow();
              callbackACalled = false;
              callbackBCalled = false;
              sut.utcNow();
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([2, 20, 100])(
            "ignore next interval callbacks if delay has not elapsed with utcNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(futureDelay, callbackA);
              sut.setInterval(futureDelay, callbackB);
              sut.utcNow();
              callbackACalled = false;
              callbackBCalled = false;
              sut.utcNow();
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
        });
      });
    });
  });
}
