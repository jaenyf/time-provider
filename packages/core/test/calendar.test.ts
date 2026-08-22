import { describe, expect, test } from "vite-plus/test";
import { CalendarSchemeFieldsHelper } from "../src/calendar/calendar-fields-helper.ts";
import { DefaultCalendarScheme } from "../src/calendar/default-calendar-scheme.ts";
import type { CalendarSchemeFields, ITimeConverter } from "../src/types/types.ts";
import {
  DEFAULT_CALENDAR_SCHEME_MONTH_NAMES,
  DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES,
} from "../src/calendar/default-calendar-scheme-names.ts";
import { IntlFormatterCache } from "../src/calendar/intl-formatter-cache.ts";
import { toInstant } from "../src/helpers/branded-types.ts";

const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => toInstant({ milliseconds: Number(time) }),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};

describe("CalendarSchemeFieldsHelper", () => {
  const base = { year: 2024, month: 3, day: 31, hour: 2, minute: 30 };

  test("equals is true for identical fields", () => {
    expect(CalendarSchemeFieldsHelper.equals(base, { ...base })).toBe(true);
  });

  test.each(["year", "month", "day", "hour", "minute"] as const)(
    "equals is false when %s differs",
    (field) => {
      expect(CalendarSchemeFieldsHelper.equals(base, { ...base, [field]: base[field] + 1 })).toBe(
        false,
      );
    },
  );

  test("equals ignores the derived weekday", () => {
    // Two field bags denoting the same instant can't disagree on weekday in practice, but equals
    // is defined over the composable subset - a bogus weekday must not change the answer.
    const withWeekday: CalendarSchemeFields = { ...base, weekday: 0 };
    const withOtherWeekday: CalendarSchemeFields = { ...base, weekday: 5 };
    expect(CalendarSchemeFieldsHelper.equals(withWeekday, withOtherWeekday)).toBe(true);
  });

  test("toComposable drops the weekday and keeps everything else", () => {
    expect(CalendarSchemeFieldsHelper.toComposable({ ...base, weekday: 4 })).toEqual(base);
  });
});

describe("IntlFormatterCache", () => {
  test("returns the same formatter instance for a repeated timezone", () => {
    const first = IntlFormatterCache.wallClockFormatter("Europe/Paris");
    const second = IntlFormatterCache.wallClockFormatter("Europe/Paris");
    expect(second).toBe(first);
  });

  test("returns distinct formatters for distinct timezones", () => {
    expect(IntlFormatterCache.wallClockFormatter("Europe/Paris")).not.toBe(
      IntlFormatterCache.wallClockFormatter("Asia/Tokyo"),
    );
  });

  test("resolves the timezone it was asked for", () => {
    expect(IntlFormatterCache.wallClockFormatter("Asia/Tokyo").resolvedOptions().timeZone).toBe(
      "Asia/Tokyo",
    );
  });
});

describe("DefaultCalendarScheme", () => {
  const sut = new DefaultCalendarScheme(identityConverter);

  test("reports the Gregorian calendar's unit sizes", () => {
    expect(sut.minutesPerHour()).toBe(60);
    expect(sut.hoursPerDay()).toBe(24);
    expect(sut.daysPerWeek()).toBe(7);
    expect(sut.monthsPerYear()).toBe(12);
    expect(sut.maxDayOfMonth()).toBe(31);
  });

  test("exposes the Gregorian month/weekday names in calendar order", () => {
    expect(sut.monthNames).toEqual(DEFAULT_CALENDAR_SCHEME_MONTH_NAMES);
    expect(sut.weekdayNames).toEqual(DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES);
    // index 0 names the first month / first weekday, which is what consumers rely on.
    expect(sut.monthNames[0]).toBe("JAN");
    expect(sut.weekdayNames[0]).toBe("SUN");
  });

  test("round-trips a timestamp through decompose/compose", () => {
    const timestamp = Date.UTC(2024, 5, 15, 14, 30);
    const fields = sut.decompose(timestamp, "Etc/UTC");
    expect(fields).toEqual({ year: 2024, month: 6, day: 15, hour: 14, minute: 30, weekday: 6 });
    expect(sut.compose(CalendarSchemeFieldsHelper.toComposable(fields), "Etc/UTC")).toBe(timestamp);
  });

  test("decompose reports wall-clock fields as observed in the given timezone", () => {
    // 2024-06-15T14:30Z is 23:30 the same day in Tokyo (UTC+9, no DST).
    const fields = sut.decompose(Date.UTC(2024, 5, 15, 14, 30), "Asia/Tokyo");
    expect(fields).toMatchObject({ year: 2024, month: 6, day: 15, hour: 23, minute: 30 });
  });

  test("toTimestamp/fromTimestamp delegate to the converter", () => {
    expect(sut.toTimestamp(1234)).toBe(1234);
    expect(sut.fromTimestamp(toInstant({ milliseconds: 1234 }))).toBe(1234);
  });

  describe("normalize", () => {
    test("leaves in-range fields untouched, deriving the weekday", () => {
      expect(sut.normalize({ year: 2024, month: 6, day: 15, hour: 14, minute: 30 })).toEqual({
        year: 2024,
        month: 6,
        day: 15,
        hour: 14,
        minute: 30,
        weekday: 6,
      });
    });

    test.each([
      [
        "minute overflow",
        { year: 2024, month: 1, day: 1, hour: 0, minute: 60 },
        { hour: 1, minute: 0 },
      ],
      ["hour overflow", { year: 2024, month: 1, day: 1, hour: 24, minute: 0 }, { day: 2, hour: 0 }],
      [
        "day overflow past a month end",
        { year: 2024, month: 1, day: 32, hour: 0, minute: 0 },
        { month: 2, day: 1 },
      ],
      [
        "month overflow past a year end",
        { year: 2024, month: 13, day: 1, hour: 0, minute: 0 },
        { year: 2025, month: 1 },
      ],
    ])("carries %s", (_label, input, expected) => {
      expect(sut.normalize(input)).toMatchObject(expected);
    });

    test("carries a leap day correctly - 2024 has a Feb 29, 2025 does not", () => {
      expect(sut.normalize({ year: 2024, month: 2, day: 30, hour: 0, minute: 0 })).toMatchObject({
        month: 3,
        day: 1,
      });
      expect(sut.normalize({ year: 2025, month: 2, day: 29, hour: 0, minute: 0 })).toMatchObject({
        month: 3,
        day: 1,
      });
    });

    test("is timezone-independent - the same fields normalize identically regardless of any DST", () => {
      // 2024-03-31 02:30 doesn't exist in Europe/Paris (spring-forward gap), but normalize is
      // pure calendar arithmetic and must not care.
      expect(sut.normalize({ year: 2024, month: 3, day: 31, hour: 2, minute: 30 })).toMatchObject({
        year: 2024,
        month: 3,
        day: 31,
        hour: 2,
        minute: 30,
      });
    });
  });
});
