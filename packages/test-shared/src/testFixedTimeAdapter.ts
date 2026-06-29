import { expect, test, describe } from "vite-plus/test";
import type { ITimeAdapter } from "@time-provider/core";

export function testFixedTimeAdapter<TDate>(
  createFixedTimeAdapter: () => ITimeAdapter<TDate>,
  createDate: (initialValue: string | number | TDate) => TDate,
) {
  describe("createFixedTimeAdapter", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createFixedTimeAdapter()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createFixedTimeAdapter()).toBe("object");
    });
  });

  describe("Adapter", () => {
    describe("localNow", () => {
      test("doesn't throw", () => {
        const sut = createFixedTimeAdapter();
        expect(() => sut.localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createFixedTimeAdapter();
        expect(sut.localNow()).not.toEqual(undefinedValue);
      });
      test("returns a fixed value", () => {
        const sut = createFixedTimeAdapter();
        expect(sut.localNow()).toEqual(createDate("2026-01-01T00:00Z"));
      });
    });

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createFixedTimeAdapter();
        expect(() => sut.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createFixedTimeAdapter();
        expect(sut.utcNow()).not.toEqual(undefinedValue);
      });
      test("returns a fixed value", () => {
        const sut = createFixedTimeAdapter();
        expect(sut.utcNow()).toEqual(createDate("2026-01-01T00:00Z"));
      });
    });

    describe("parse", () => {
      test.each(["2026-01-01T00:00Z", 100, createDate("2026-01-01T00:00Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createFixedTimeAdapter();
          expect(() => sut.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00Z", 100, createDate("2026-01-01T00:00Z")])(
        "returns a value",
        (toParse: string | number | TDate) => {
          const sut = createFixedTimeAdapter();
          expect(sut.parse(toParse)).not.toEqual(undefined);
          expect(sut.parse(toParse)).not.toEqual(null);
        },
      );
      test.each(["2026-01-01T00:00Z", 100, createDate("2026-01-01T00:00Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createFixedTimeAdapter();
          expect(sut.parse(toParse)).toEqual(createDate(toParse));
        },
      );
    });
  });
}
