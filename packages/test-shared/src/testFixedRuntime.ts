import { expect, test, describe } from "vite-plus/test";
import type { IPlugin } from "@time-provider/core";
import { testScheduler } from "./testScheduler.ts";

export function testFixedRuntime<TDate>(
  plugin: IPlugin<TDate>,
  parseTime: (initialValue: string | number | TDate) => TDate,
) {
  const createSUT = () => plugin.createFixedRuntime("2026-01-01T00:00:00.000Z");

  describe("createFixedRuntime", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createSUT()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createSUT()).toBe("object");
    });
    test.each(["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"])(
      "can construct an object with a string",
      (isoTimeText: string) => {
        plugin.createFixedRuntime(isoTimeText);
      },
    );
    test.each([0, 100])("can construct an object with a number", (milliseconds: number) => {
      plugin.createFixedRuntime(milliseconds);
    });
    test("can construct an object with a TDate", () => {
      plugin.createFixedRuntime(parseTime("2026-01-01T00:00:00.000Z"));
    });
  });

  describe("fixed", () => {
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
      test.each(["2026-01-01T00:00Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(() => sut.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "returns a value",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(sut.parse(toParse)).not.toEqual(undefined);
          expect(sut.parse(toParse)).not.toEqual(null);
        },
      );
      test.each(["2026-01-01T00:00Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(sut.parse(toParse)).toEqual(parseTime(toParse));
        },
      );
    });
    describe("scheduler", () => {
      testScheduler(() => createSUT().scheduler);
    });
  });
}
