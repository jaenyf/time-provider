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
        expect(() => sut.clock.localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSUT();
        expect(sut.clock.localNow()).not.toEqual(undefinedValue);
      });
      test("returns first added value", () => {
        const sut = createSUT();
        expect(sut.clock.localNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
      });
      test("returns epoch time when no added value", () => {
        const sut = plugin.createSequentialRuntime([]);
        expect(sut.clock.localNow()).toEqual(parseTime("1970-01-01T00:00:00.000Z"));
      });
      test("multiple calls returns sequentially defined times", () => {
        const sut = createSUT();
        expect(sut.clock.localNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
        expect(sut.clock.localNow()).toEqual(parseTime("2026-01-01T00:00:02.000Z"));
        expect(sut.clock.localNow()).toEqual(parseTime("2026-01-01T00:00:03.000Z"));
      });
      test("overflowing calls returns last defined time", () => {
        const sut = plugin.createSequentialRuntime(["2026-01-01T00:00Z"]);
        expect(sut.clock.localNow()).toEqual(parseTime("2026-01-01T00:00Z"));
        expect(sut.clock.localNow()).toEqual(parseTime("2026-01-01T00:00Z"));
        expect(sut.clock.localNow()).toEqual(parseTime("2026-01-01T00:00Z"));
      });
    });

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
        expect(sut.clock.utcNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
      });
      test("returns epoch time when no added value", () => {
        const sut = plugin.createSequentialRuntime([]);
        expect(sut.clock.utcNow()).toEqual(parseTime("1970-01-01T00:00:00.000Z"));
      });
      test("multiple calls returns sequentially defined times", () => {
        const sut = createSUT();
        expect(sut.clock.utcNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
        expect(sut.clock.utcNow()).toEqual(parseTime("2026-01-01T00:00:02.000Z"));
        expect(sut.clock.utcNow()).toEqual(parseTime("2026-01-01T00:00:03.000Z"));
      });
      test("overflowing calls returns last defined time", () => {
        const sut = plugin.createSequentialRuntime(["2026-01-01T00:00Z"]);
        expect(sut.clock.utcNow()).toEqual(parseTime("2026-01-01T00:00Z"));
        expect(sut.clock.utcNow()).toEqual(parseTime("2026-01-01T00:00Z"));
        expect(sut.clock.utcNow()).toEqual(parseTime("2026-01-01T00:00Z"));
      });
    });

    describe("parse", () => {
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(() => sut.parser.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "returns a value",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(sut.parser.parse(toParse)).not.toEqual(undefined);
          expect(sut.parser.parse(toParse)).not.toEqual(null);
        },
      );
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(sut.parser.parse(toParse)).toEqual(parseTime(toParse));
        },
      );
    });

    describe("scheduler", () => {
      testScheduler(() => createSUT().scheduler);
      describe("additionnal", () => {
        describe("setTimeout", () => {
          test("can be called without specified delay", () => {
            const sut = plugin.createSequentialRuntime([0, 1000]);
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.setTimeout(callback);
            sut.clock.localNow();
            expect(callbackCalled).toBe(true);
          });
          test.each([2, 20, 100])(
            "executes next callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setTimeout(callbackA, futureDelay);
              sut.setTimeout(callbackB, futureDelay);
              sut.clock.localNow();
              sut.clock.localNow();
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
              sut.setTimeout(callbackA, futureDelay * 2);
              sut.setTimeout(callbackB, futureDelay * 2);
              sut.clock.localNow();
              sut.clock.localNow();
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
              const timeoutHandleA = sut.setTimeout(callbackA, futureDelay);
              const timeoutHandleB = sut.setTimeout(callbackB, futureDelay);
              sut.clearTimeout(timeoutHandleA);
              sut.clearTimeout(timeoutHandleB);
              sut.clock.localNow();
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
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
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
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
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
            const sut = plugin.createSequentialRuntime([0, 1000]);
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.setInterval(callback);
            sut.clock.localNow();
            expect(callbackCalled).toBe(true);
          });
          test.each([2, 20, 100])(
            "executes next callbacks when time advance with localNow",
            (futureDelay: number) => {
              const sut = plugin.createSequentialRuntime([0, futureDelay * 2]);
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
              sut.clock.localNow();
              sut.clock.localNow();
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
              sut.setInterval(callbackA, futureDelay * 2);
              sut.setInterval(callbackB, futureDelay * 2);
              sut.clock.localNow();
              sut.clock.localNow();
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
              const timeoutHandleA = sut.setInterval(callbackA, futureDelay);
              const timeoutHandleB = sut.setInterval(callbackB, futureDelay);
              sut.clearInterval(timeoutHandleA);
              sut.clearInterval(timeoutHandleB);
              sut.clock.localNow();
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
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
              sut.clock.localNow();
              callbackACalled = false;
              callbackBCalled = false;
              sut.clock.localNow();
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
              sut.setInterval(callbackA, futureDelay);
              sut.setInterval(callbackB, futureDelay);
              sut.clock.localNow();
              callbackACalled = false;
              callbackBCalled = false;
              sut.clock.localNow();
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
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
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
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
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
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay * 2]);
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
              const sut = plugin.createSequentialRuntime([futureDelay, futureDelay + 1]);
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
              const sut = plugin.createSequentialRuntime([0, expectedRetries * 1000]);
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
