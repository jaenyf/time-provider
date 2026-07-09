import { expect, test, describe } from "vite-plus/test";
import type { IPlugin, IScheduler } from "@time-provider/core";

export function testManualTimeAdapter<TDate>(
  plugin: IPlugin<TDate>,
  scheduler: IScheduler,
  parseTime: (initialValue: string | number | TDate) => TDate,
) {
  const createManualTimeAdapter = () =>
    plugin.createManualTimeAdapter(scheduler, "2026-01-01T00:00:00.000Z");

  describe("createManualTimeAdapter", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createManualTimeAdapter()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createManualTimeAdapter()).toBe("object");
    });
    test.each(["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"])(
      "can construct an object with a string",
      (isoTimeText: string) => {
        plugin.createManualTimeAdapter(scheduler, isoTimeText);
      },
    );
    test.each([0, 100])("can construct an object with a number", (milliseconds: number) => {
      plugin.createManualTimeAdapter(scheduler, milliseconds);
    });
    test("can construct an object with a TDate", () => {
      plugin.createManualTimeAdapter(scheduler, parseTime("2026-01-01T00:00:00.000Z"));
    });
  });

  describe("ManualTimeAdapter", () => {
    describe("localNow", () => {
      test("doesn't throw", () => {
        const sut = createManualTimeAdapter();
        expect(() => sut.localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createManualTimeAdapter();
        expect(sut.localNow()).not.toEqual(undefinedValue);
      });
      test("returns a fixed value", () => {
        const sut = createManualTimeAdapter();
        expect(sut.localNow()).toEqual(parseTime("2026-01-01T00:00:00.000Z"));
      });
    });

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createManualTimeAdapter();
        expect(() => sut.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createManualTimeAdapter();
        expect(sut.utcNow()).not.toEqual(undefinedValue);
      });
      test("returns a fixed value", () => {
        const sut = createManualTimeAdapter();
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:00.000Z"));
      });
    });

    describe("parse", () => {
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "doesn't throw",
        (toParse: string | number | TDate) => {
          const sut = createManualTimeAdapter();
          expect(() => sut.parse(toParse)).not.toThrow();
        },
      );
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "returns a value",
        (toParse: string | number | TDate) => {
          const sut = createManualTimeAdapter();
          expect(sut.parse(toParse)).not.toEqual(undefined);
          expect(sut.parse(toParse)).not.toEqual(null);
        },
      );
      test.each(["2026-01-01T00:00:00.000Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
        "aligns with native TDate construction",
        (toParse: string | number | TDate) => {
          const sut = createManualTimeAdapter();
          expect(sut.parse(toParse)).toEqual(parseTime(toParse));
        },
      );
    });

    describe("advance", () => {
      test("returns itself", () => {
        const sut = createManualTimeAdapter();
        const instance = sut.advance({});
        expect(instance).toBe(sut);
      });

      test("moves up years", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ years: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2027-01-01T00:00:00.000Z"));
      });

      test("moves down years", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ years: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-01-01T00:00:00.000Z"));
      });

      test("moves up months", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ months: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-02-01T00:00:00.000Z"));
      });

      test("moves down months", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ months: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-01T00:00:00.000Z"));
      });

      test("moves up days", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ days: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-02T00:00:00.000Z"));
      });

      test("moves down days", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ days: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T00:00:00.000Z"));
      });

      test("moves up hours", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ hours: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T01:00:00.000Z"));
      });

      test("moves down hours", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ hours: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T23:00:00.000Z"));
      });

      test("moves up minutes", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ minutes: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:01:00.000Z"));
      });

      test("moves down minutes", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ minutes: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T23:59:00.000Z"));
      });

      test("moves up seconds", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ seconds: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:01.000Z"));
      });

      test("moves down seconds", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ seconds: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T23:59:59.000Z"));
      });

      test("moves up milliseconds", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ milliseconds: 1 });
        expect(sut.utcNow()).toEqual(parseTime("2026-01-01T00:00:00.001Z"));
      });

      test("moves down milliseconds", () => {
        const sut = createManualTimeAdapter();
        sut.advance({ milliseconds: -1 });
        expect(sut.utcNow()).toEqual(parseTime("2025-12-31T23:59:59.999Z"));
      });
    });
  });
}
