import { expect, test, describe } from "vite-plus/test";
import type { IPlugin } from "@time-provider/core";

export function testSequentialTimeAdapter<TDate>(
  plugin: IPlugin<TDate>,
  parseTime: (initialValue: string | number | TDate) => TDate,
) {
  const createSequentialTimeAdapter = () =>
    plugin.createSequentialTimeAdapter([
      "2026-01-01T00:00:01.000Z",
      "2026-01-01T00:00:02.000Z",
      "2026-01-01T00:00:03.000Z",
    ]);

  describe("createSequentialTimeAdapter", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createSequentialTimeAdapter()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createSequentialTimeAdapter()).toBe("object");
    });
    test.each(["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"])(
      "can construct an object with a string",
      (isoTimeText: string) => {
        plugin.createSequentialTimeAdapter([isoTimeText]);
      },
    );
    test.each([0, 100])("can construct an object with a number", (milliseconds: number) => {
      plugin.createSequentialTimeAdapter([milliseconds]);
    });
    test("can construct an object with a TDate", () => {
      plugin.createSequentialTimeAdapter([parseTime("2026-01-01T00:00:00.000Z")]);
    });
  });

  describe("SequentialTimeAdapter", () => {
    describe("localNow", () => {
      test("doesn't throw", () => {
        const sut = createSequentialTimeAdapter();
        expect(() => sut.localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSequentialTimeAdapter();
        expect(sut.localNow()).not.toEqual(undefinedValue);
      });
      test("returns first added value", () => {
        const sut = createSequentialTimeAdapter();
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
      });
      test("multiple calls returns sequentially defined times", () => {
        const sut = createSequentialTimeAdapter();
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:02.000Z"));
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:03.000Z"));
      });
    });

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createSequentialTimeAdapter();
        expect(() => sut.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSequentialTimeAdapter();
        expect(sut.utcNow()).not.toEqual(undefinedValue);
      });
      test("returns first added value", () => {
        const sut = createSequentialTimeAdapter();
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
      });
      test("multiple calls returns sequentially defined times", () => {
        const sut = createSequentialTimeAdapter();
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:02.000Z"));
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:03.000Z"));
      });
    });

    describe("parse", () => {
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createSequentialTimeAdapter();
          expect(() => sut.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "returns a value",
        (toParse: string | number | TDate) => {
          const sut = createSequentialTimeAdapter();
          expect(sut.parse(toParse)).not.toEqual(undefined);
          expect(sut.parse(toParse)).not.toEqual(null);
        },
      );
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createSequentialTimeAdapter();
          expect(sut.parse(toParse)).toEqual(parseTime(toParse));
        },
      );
    });
  });
}
