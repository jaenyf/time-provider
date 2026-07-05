import { expect, test, describe } from "vite-plus/test";
import type { IPlugin } from "@time-provider/core";

export function testTimeAdapter<TDate>(
  plugin: IPlugin<TDate>,
  createDate: (initialValue: string | number | TDate) => TDate,
) {
  const createTimeAdapter = () => plugin.createTimeAdapter();

  describe("createTimeAdapter", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createTimeAdapter()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createTimeAdapter()).toBe("object");
    });
  });

  describe("Adapter", () => {
    describe("localNow", () => {
      test("doesn't throw", () => {
        const sut = createTimeAdapter();
        expect(() => sut.localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createTimeAdapter();
        expect(sut.localNow()).not.toEqual(undefinedValue);
      });
    });

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createTimeAdapter();
        expect(() => sut.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createTimeAdapter();
        expect(sut.utcNow()).not.toEqual(undefinedValue);
      });
    });

    describe("parse", () => {
      test.each(["2026-01-01T00:00Z", 100, createDate("2026-01-01T00:00Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createTimeAdapter();
          expect(() => sut.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00Z", 100, createDate("2026-01-01T00:00Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createTimeAdapter();
          expect(sut.parse(toParse)).toEqual(createDate(toParse));
        },
      );
    });
  });
}
