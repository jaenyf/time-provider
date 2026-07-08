import { expect, test, describe } from "vite-plus/test";
import type { IPlugin } from "@time-provider/core";

export function testFixedTimeAdapter<TDate>(
  plugin: IPlugin<TDate>,
  createDate: (initialValue: string | number | TDate) => TDate,
) {
  const createSUT = () => plugin.createFixedTimeAdapter("2026-01-01T00:00:00.000Z");

  describe("createFixedTimeAdapter", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createSUT()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createSUT()).toBe("object");
    });
    test.each(["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"])(
      "can construct an object with a string",
      (isoTimeText: string) => {
        plugin.createFixedTimeAdapter(isoTimeText);
      },
    );
    test.each([0, 100])("can construct an object with a number", (milliseconds: number) => {
      plugin.createFixedTimeAdapter(milliseconds);
    });
    test("can construct an object with a TDate", () => {
      plugin.createFixedTimeAdapter(createDate("2026-01-01T00:00:00.000Z"));
    });
  });

  describe("Adapter", () => {
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
        expect(sut.localNow()).toEqual(createDate("2026-01-01T00:00:00.000Z"));
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
        expect(sut.utcNow()).toEqual(createDate("2026-01-01T00:00:00.000Z"));
      });
    });

    describe("parse", () => {
      test.each(["2026-01-01T00:00Z", 100, createDate("2026-01-01T00:00:00.000Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(() => sut.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00Z", 100, createDate("2026-01-01T00:00:00.000Z")])(
        "returns a value",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(sut.parse(toParse)).not.toEqual(undefined);
          expect(sut.parse(toParse)).not.toEqual(null);
        },
      );
      test.each(["2026-01-01T00:00Z", 100, createDate("2026-01-01T00:00:00.000Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createSUT();
          expect(sut.parse(toParse)).toEqual(createDate(toParse));
        },
      );
    });
  });
}
