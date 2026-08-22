import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { DefaultCalendarScheme } from "../src/calendar/default-calendar-scheme.ts";
import { TimeInputValidator } from "../src/runtimes/runtime-base.ts";
import { BaseSystemRuntime } from "../src/runtimes/system-runtime.ts";
import type { EpochMilliseconds, ICalendarScheme, ITimeConverter } from "../src/types/types.ts";
import { asEpochMilliseconds } from "../src/helpers/branded-types.ts";

class FakeRuntime extends BaseSystemRuntime<unknown> {
  constructor(converter: ITimeConverter<unknown>) {
    super("Etc/UTC", converter);
  }
  timestampNow(): EpochMilliseconds {
    return asEpochMilliseconds();
  }
  localNow(): unknown {
    return 0;
  }
  utcNow(): unknown {
    return 0;
  }
}

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
  test("falls back to the shared default when the converter doesn't provide one", () => {
    const converter: ITimeConverter<unknown> = {
      convertToTimestamp: () => asEpochMilliseconds(),
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
    };
    const sut = new FakeRuntime(converter);
    expect(sut.calendarScheme).toBeInstanceOf(DefaultCalendarScheme);
    expect(sut.calendarScheme.daysPerWeek()).toBe(7);
  });

  test("resolves the adapter once, so every read returns the same instance", () => {
    const converter: ITimeConverter<unknown> = {
      convertToTimestamp: () => asEpochMilliseconds(),
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
      convertToTimestamp: () => asEpochMilliseconds(),
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
    };
    new FakeRuntime(converter);
    expect(converter.calendarScheme).toBeUndefined();
  });

  test("returns the converter's own calendar scheme when it provides one", () => {
    const custom: ICalendarScheme<unknown> = new DefaultCalendarScheme({
      convertToTimestamp: () => asEpochMilliseconds(),
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
    });
    const converter: ITimeConverter<unknown> = {
      convertToTimestamp: () => asEpochMilliseconds(),
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
      calendarScheme: custom,
    };
    const sut = new FakeRuntime(converter);
    expect(sut.calendarScheme).toBe(custom);
  });
});

describe("BaseRuntime Timers wait", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  test("aze", async () => {
    const converter: ITimeConverter<unknown> = {
      convertToTimestamp: () => asEpochMilliseconds(),
      convertToUtcDate: (time) => time,
      convertToLocalDate: (_timezone, time) => time,
    };
    const sut = new FakeRuntime(converter);

    const waitPromise = sut.wait({ milliseconds: 1000 });

    await vi.advanceTimersByTimeAsync(999);

    // The promise is still pending.
    let resolved = false;
    void waitPromise.then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    await expect(waitPromise).resolves.toBeUndefined();
  });
});
