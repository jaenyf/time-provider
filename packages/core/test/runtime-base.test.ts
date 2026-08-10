import { describe, expect, test } from "vite-plus/test";
import { BaseSystemRuntime, DefaultCalendarScheme, TimeInputValidator } from "@time-provider/core";
import type { ICalendarScheme, ITimeConverter } from "@time-provider/core";

describe("TimeInputValidator", () => {
  describe("assertValid", () => {
    test.each([undefined, null, Number.NaN, "", "   "])(
      "throws for %s",
      (invalidValue: unknown) => {
        expect(() => TimeInputValidator.assertValid(invalidValue as string)).toThrow();
      },
    );

    test.each([0, -1, 1, "x", "0", {}])("does not throw for %s", (validValue: unknown) => {
      expect(() => TimeInputValidator.assertValid(validValue as string)).not.toThrow();
    });
  });
});

describe("BaseRuntime calendar", () => {
  class FakeRuntime extends BaseSystemRuntime<unknown> {
    constructor(converter: ITimeConverter<unknown>) {
      super("Etc/UTC", converter);
    }
    timestampNow(): number {
      return 0;
    }
    localNow(): unknown {
      return 0;
    }
    utcNow(): unknown {
      return 0;
    }
  }

  test("falls back to the shared default when the converter doesn't provide one", () => {
    const converter: ITimeConverter<unknown> = {
      convertToTimestamp: () => 0,
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
    };
    const sut = new FakeRuntime(converter);
    expect(sut.calendarScheme).toBeInstanceOf(DefaultCalendarScheme);
    expect(sut.calendarScheme.daysPerWeek()).toBe(7);
  });

  test("resolves the adapter once, so every read returns the same instance", () => {
    const converter: ITimeConverter<unknown> = {
      convertToTimestamp: () => 0,
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
    };
    const sut = new FakeRuntime(converter);
    expect(sut.calendarScheme).toBe(sut.calendarScheme);
  });

  test("a converter that provides no adapter doesn't get one written back onto it", () => {
    // The fallback belongs to the runtime, not the converter - converters are typically shared
    // static classes, so a runtime must not mutate one just by being constructed.
    const converter: ITimeConverter<unknown> = {
      convertToTimestamp: () => 0,
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
    };
    new FakeRuntime(converter);
    expect(converter.calendarScheme).toBeUndefined();
  });

  test("returns the converter's own calendar scheme when it provides one", () => {
    const custom: ICalendarScheme<unknown> = new DefaultCalendarScheme({
      convertToTimestamp: () => 0,
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
    });
    const converter: ITimeConverter<unknown> = {
      convertToTimestamp: () => 0,
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
      calendarScheme: custom,
    };
    const sut = new FakeRuntime(converter);
    expect(sut.calendarScheme).toBe(custom);
  });
});
