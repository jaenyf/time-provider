import { describe, expect, test } from "vite-plus/test";
import type {
  CalendarFields,
  ComposableCalendarFields,
  ICalendarAdapter,
  TimezoneDefinition,
} from "@time-provider/core";
import { computeNextOccurrence, parseCronExpression, parseCronSpec } from "../src/cron-parser.ts";

/*
 * A calendar deliberately unlike the Gregorian one in every unit cron touches: 36 months of 10
 * days, a 10-day week, and days of 10 hours x 100 minutes. Nothing about it is realistic - that's
 * the point. If cron still parses and resolves against it, the parser genuinely delegates every
 * calendar question to the adapter rather than assuming 12/31/7/24/60 anywhere.
 *
 * `TDate` here is simply "minutes since this calendar's epoch", which keeps the adapter itself
 * pure arithmetic and lets the tests below assert exact instants.
 */
const MINUTES_PER_HOUR = 100;
const HOURS_PER_DAY = 10;
const DAYS_PER_WEEK = 10;
const DAYS_PER_MONTH = 10;
const MONTHS_PER_YEAR = 36;
const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;

const EXOTIC_MONTH_NAMES = [
  "AAA",
  "BBB",
  "CCC",
  "DDD",
  "EEE",
  "FFF",
  "GGG",
  "HHH",
  "III",
  "JJJ",
  "KKK",
  "LLL",
  "MMM",
  "NNN",
  "OOO",
  "PPP",
  "QQQ",
  "RRR",
  "SSS",
  "TTT",
  "UUU",
  "VVV",
  "WWW",
  "XXX",
  "YYY",
  "XYZ",
  "ZYX",
  "ABC",
  "BCD",
  "CDE",
  "DEF",
  "EFG",
  "FGH",
  "GHI",
  "HIJ",
  "IJK",
] as const;
type ExoticMonthName = (typeof EXOTIC_MONTH_NAMES)[number];

const EXOTIC_WEEKDAY_NAMES = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9"] as const;
type ExoticWeekdayName = (typeof EXOTIC_WEEKDAY_NAMES)[number];

class ExoticCalendarAdapter implements ICalendarAdapter<
  number,
  ExoticMonthName,
  ExoticWeekdayName
> {
  readonly monthNames: readonly ExoticMonthName[] = EXOTIC_MONTH_NAMES;
  readonly weekdayNames: readonly ExoticWeekdayName[] = EXOTIC_WEEKDAY_NAMES;

  toTimestamp(date: number): number {
    return date;
  }
  fromTimestamp(timestampMs: number): number {
    return timestampMs;
  }
  minutesPerHour(): number {
    return MINUTES_PER_HOUR;
  }
  hoursPerDay(): number {
    return HOURS_PER_DAY;
  }
  daysPerWeek(): number {
    return DAYS_PER_WEEK;
  }
  monthsPerYear(): number {
    return MONTHS_PER_YEAR;
  }
  maxDayOfMonth(): number {
    return DAYS_PER_MONTH;
  }

  normalize(fields: ComposableCalendarFields): CalendarFields {
    return this.#fromTotalMinutes(ExoticCalendarAdapter.#toTotalMinutes(fields));
  }
  /** This calendar has no timezones at all - `timezone` is irrelevant to it. */
  decompose(date: number, _timezone: TimezoneDefinition): CalendarFields {
    return this.#fromTotalMinutes(date);
  }
  compose(fields: ComposableCalendarFields, _timezone: TimezoneDefinition): number {
    return ExoticCalendarAdapter.#toTotalMinutes(fields);
  }

  static #toTotalMinutes(fields: ComposableCalendarFields): number {
    const months = fields.year * MONTHS_PER_YEAR + (fields.month - 1);
    const days = months * DAYS_PER_MONTH + (fields.day - 1);
    return days * MINUTES_PER_DAY + fields.hour * MINUTES_PER_HOUR + fields.minute;
  }

  #fromTotalMinutes(total: number): CalendarFields {
    const days = Math.floor(total / MINUTES_PER_DAY);
    const months = Math.floor(days / DAYS_PER_MONTH);
    return {
      year: Math.floor(months / MONTHS_PER_YEAR),
      month: (months % MONTHS_PER_YEAR) + 1,
      day: (days % DAYS_PER_MONTH) + 1,
      hour: Math.floor(total / MINUTES_PER_HOUR) % HOURS_PER_DAY,
      minute: total % MINUTES_PER_HOUR,
      weekday: days % DAYS_PER_WEEK,
    };
  }
}

const adapter = new ExoticCalendarAdapter();
/** This calendar is timezone-free; the argument is threaded through but never consulted. */
const noTimezone = "";

describe("cron against a non-Gregorian calendar", () => {
  describe("field bounds come from the calendar, not from Gregorian constants", () => {
    test("accepts a 33rd month and a 7th day - the calendar has 36 months of 10 days", () => {
      const parsed = parseCronExpression("* * 7 33 *", adapter);
      expect([...parsed.month.values]).toEqual([33]);
      expect([...parsed.dayOfMonth.values]).toEqual([7]);
    });

    test("resolves the next occurrence of that expression to the calendar's own instant", () => {
      const parsed = parseCronExpression("* * 7 33 *", adapter);
      // year 0, month 33, day 7, 00:00 - 326 whole days past the epoch, at 1000 minutes/day.
      expect(computeNextOccurrence(parsed, 0, noTimezone, adapter)).toBe(326 * MINUTES_PER_DAY);
    });

    test("rejects a month past this calendar's 36", () => {
      expect(() => parseCronExpression("* * * 37 *", adapter)).toThrow(
        /out of range \(expected 1-36\)/,
      );
    });

    test("rejects a day past this calendar's 10", () => {
      expect(() => parseCronExpression("* * 11 * *", adapter)).toThrow(
        /out of range \(expected 1-10\)/,
      );
    });

    test("accepts an hour of 9 and rejects 10 - days here are 10 hours long", () => {
      expect(() => parseCronExpression("* 9 * * *", adapter)).not.toThrow();
      expect(() => parseCronExpression("* 10 * * *", adapter)).toThrow(
        /out of range \(expected 0-9\)/,
      );
    });

    test("accepts a minute of 99 and rejects 100 - hours here are 100 minutes long", () => {
      expect(() => parseCronExpression("99 * * * *", adapter)).not.toThrow();
      expect(() => parseCronExpression("100 * * * *", adapter)).toThrow(
        /out of range \(expected 0-99\)/,
      );
    });

    test("a Gregorian-valid expression that this calendar disallows is rejected", () => {
      // 24-hour/60-minute values are perfectly ordinary elsewhere, and meaningless here.
      expect(() => parseCronExpression("30 23 * * *", adapter)).toThrow(/out of range/);
    });
  });

  describe("names come from the calendar, not from JAN-DEC/SUN-SAT", () => {
    test("resolves this calendar's own month name", () => {
      const parsed = parseCronExpression("* * 1 ZYX *", adapter);
      expect([...parsed.month.values]).toEqual([EXOTIC_MONTH_NAMES.indexOf("ZYX") + 1]);
    });

    test("resolves a range between two of this calendar's month names", () => {
      const parsed = parseCronExpression("* * 1 XYZ-ZYX *", adapter);
      expect([...parsed.month.values].sort((a, b) => a - b)).toEqual([26, 27]);
    });

    test("resolves this calendar's own weekday names, matched case-insensitively", () => {
      const parsed = parseCronExpression("* * * * d3-d5", adapter);
      expect([...parsed.dayOfWeek.values].sort((a, b) => a - b)).toEqual([3, 4, 5]);
    });

    test("rejects a Gregorian month name this calendar doesn't define", () => {
      expect(() => parseCronExpression("* * 1 JAN *", adapter)).toThrow(/not a valid value/);
    });

    test("the day-of-week alias wraps at this calendar's week length, not at 7", () => {
      // A 10-day week means 10 - not 7 - is the alias for day 0.
      const parsed = parseCronExpression("* * * * 10", adapter);
      expect([...parsed.dayOfWeek.values]).toEqual([0]);
      const stillDistinct = parseCronExpression("* * * * 7", adapter);
      expect([...stillDistinct.dayOfWeek.values]).toEqual([7]);
    });
  });

  describe("the JSON spec form delegates identically", () => {
    test("accepts this calendar's month name and out-of-Gregorian-range numbers", () => {
      const parsed = parseCronSpec({ month: "ZYX", dayOfMonth: 7, hour: 9, minute: 99 }, adapter);
      expect([...parsed.month.values]).toEqual([27]);
      expect([...parsed.hour.values]).toEqual([9]);
      expect([...parsed.minute.values]).toEqual([99]);
    });

    test("rejects a value out of this calendar's range", () => {
      expect(() => parseCronSpec({ month: 37 }, adapter)).toThrow(/out of range \(expected 1-36\)/);
    });

    test("a wildcard field expands to every value this calendar allows", () => {
      const parsed = parseCronSpec({}, adapter);
      expect(parsed.month.values.size).toBe(MONTHS_PER_YEAR);
      expect(parsed.hour.values.size).toBe(HOURS_PER_DAY);
      expect(parsed.minute.values.size).toBe(MINUTES_PER_HOUR);
      expect(parsed.dayOfMonth.values.size).toBe(DAYS_PER_MONTH);
      expect(parsed.dayOfWeek.values.size).toBe(DAYS_PER_WEEK);
    });
  });

  test("weekday matching uses the calendar's own 10-day week", () => {
    // Day 0 of the calendar is weekday 0, so weekday 3 first falls on day 4 of month 1.
    const parsed = parseCronExpression("0 0 * * D3", adapter);
    expect(computeNextOccurrence(parsed, 0, noTimezone, adapter)).toBe(3 * MINUTES_PER_DAY);
  });
});
