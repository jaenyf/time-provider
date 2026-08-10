import { describe, expect, test } from "vite-plus/test";
import { DefaultCalendarScheme, type ITimeConverter } from "@time-provider/core";
import {
  computeNextOccurrence,
  cronExpressionToSpec,
  parseCronExpression,
  parseCronSpec,
  type ICronSpec,
} from "../src/cron-parser.ts";

/*
 * cron-parser works purely in epoch milliseconds - an identity ITimeConverter<number> (numbers
 * stand in for TDate here) paired with the shared default calendar scheme reproduces the
 * pre-TDate-generic Gregorian/Intl behavior these tests were originally written against.
 */
const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => Number(time),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};
const defaultCalendarScheme = new DefaultCalendarScheme(identityConverter);

describe("parseCronExpression", () => {
  test("accepts a wildcard-only expression", () => {
    expect(() => parseCronExpression("* * * * *", defaultCalendarScheme)).not.toThrow();
  });

  test("accepts a comma-separated list", () => {
    const parsed = parseCronExpression("0,15,30,45 * * * *", defaultCalendarScheme);
    expect([...parsed.minute.values].sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
  });

  test("accepts a range", () => {
    const parsed = parseCronExpression("1-5 * * * *", defaultCalendarScheme);
    expect([...parsed.minute.values].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  test("accepts a wildcard step", () => {
    const parsed = parseCronExpression("*/15 * * * *", defaultCalendarScheme);
    expect([...parsed.minute.values].sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
  });

  test("accepts a range step", () => {
    const parsed = parseCronExpression("0-30/10 * * * *", defaultCalendarScheme);
    expect([...parsed.minute.values].sort((a, b) => a - b)).toEqual([0, 10, 20, 30]);
  });

  test("accepts month names, case-insensitively", () => {
    const parsed = parseCronExpression("0 0 1 jan,JUL *", defaultCalendarScheme);
    expect([...parsed.month.values].sort((a, b) => a - b)).toEqual([1, 7]);
  });

  test("accepts day-of-week names and ranges", () => {
    const parsed = parseCronExpression("0 9 * * MON-FRI", defaultCalendarScheme);
    expect([...parsed.dayOfWeek.values].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  test("normalizes day-of-week 7 to the Sunday alias 0", () => {
    const parsed = parseCronExpression("0 0 * * 7", defaultCalendarScheme);
    expect([...parsed.dayOfWeek.values]).toEqual([0]);
  });

  test("marks a field as wildcard only when its text is exactly *", () => {
    const parsed = parseCronExpression("0-59 * * * *", defaultCalendarScheme);
    expect(parsed.minute.isWildcard).toBe(false);
    expect(parsed.hour.isWildcard).toBe(true);
  });

  test("throws when the expression does not have exactly 5 fields", () => {
    expect(() => parseCronExpression("* * * *", defaultCalendarScheme)).toThrow(
      /expected 5 fields/,
    );
  });

  test("throws for a value out of range (too high)", () => {
    expect(() => parseCronExpression("60 * * * *", defaultCalendarScheme)).toThrow(/out of range/);
  });

  test("throws for a value out of range (too low)", () => {
    expect(() => parseCronExpression("* * 0 * *", defaultCalendarScheme)).toThrow(/out of range/);
  });

  test("throws for a non-numeric, non-name token", () => {
    expect(() => parseCronExpression("abc * * * *", defaultCalendarScheme)).toThrow(
      /not a valid value/,
    );
  });

  test.each(["0x1E", "1e1", "0o17", "0b101", "1.5"])(
    "throws for a JS numeric-literal-syntax value that isn't a plain decimal integer (%s)",
    (token) => {
      expect(() => parseCronExpression(`${token} * * * *`, defaultCalendarScheme)).toThrow(
        /not a valid value/,
      );
    },
  );

  test("throws for a JS numeric-literal-syntax step, same as a value", () => {
    expect(() => parseCronExpression("*/0x2 * * * *", defaultCalendarScheme)).toThrow(
      /not a valid step/,
    );
  });

  test("throws for an unrecognized name", () => {
    expect(() => parseCronExpression("0 0 1 FOO *", defaultCalendarScheme)).toThrow(
      /not a valid value/,
    );
  });

  test("throws for an empty token", () => {
    expect(() => parseCronExpression("1, * * * *", defaultCalendarScheme)).toThrow(
      /not a valid value/,
    );
  });

  test("throws for a range given in the wrong order", () => {
    expect(() => parseCronExpression("10-5 * * * *", defaultCalendarScheme)).toThrow(
      /out of order/,
    );
  });

  test("throws for a non-positive step", () => {
    expect(() => parseCronExpression("*/0 * * * *", defaultCalendarScheme)).toThrow(
      /not a valid step/,
    );
  });

  test("throws for a non-integer step", () => {
    expect(() => parseCronExpression("*/abc * * * *", defaultCalendarScheme)).toThrow(
      /not a valid step/,
    );
  });

  describe("a malformed part is rejected rather than silently truncated", () => {
    test.each(["*/2/3", "5/2/3", "1-10/2/3"])("throws for a second step in %s", (part) => {
      // Reading these as "*\/2" etc. would turn a typo into a different, valid-looking schedule.
      expect(() => parseCronExpression(`${part} * * * *`, defaultCalendarScheme)).toThrow(
        /has more than one step/,
      );
    });

    test.each(["1-2-3", "1-2-3/2"])("throws for a second range bound in %s", (part) => {
      expect(() => parseCronExpression(`${part} * * * *`, defaultCalendarScheme)).toThrow(
        /range "1-2-3" is malformed/,
      );
    });

    test("a single step and a single range are still accepted", () => {
      expect([
        ...parseCronExpression("0-10/5 * * * *", defaultCalendarScheme).minute.values,
      ]).toEqual([0, 5, 10]);
    });
  });
});

describe("computeNextOccurrence", () => {
  const utc = "Etc/UTC";

  test("wildcard expression matches the very next minute", () => {
    const parsed = parseCronExpression("* * * * *", defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 30, 15);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 31, 0),
    );
  });

  test("fixed time-of-day, later the same day", () => {
    const parsed = parseCronExpression("30 9 * * *", defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 8, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 9, 30, 0),
    );
  });

  test("fixed time-of-day, already passed today rolls over to tomorrow", () => {
    const parsed = parseCronExpression("30 9 * * *", defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 2, 9, 30, 0),
    );
  });

  test("minute list", () => {
    const parsed = parseCronExpression("0,15,30,45 * * * *", defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 20, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 30, 0),
    );
  });

  test("minute wildcard step", () => {
    const parsed = parseCronExpression("*/15 * * * *", defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 5, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 15, 0),
    );
  });

  test("minute range step", () => {
    const parsed = parseCronExpression("0-30/10 * * * *", defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 5, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 10, 0),
    );
  });

  test("hour range with step", () => {
    const parsed = parseCronExpression("0 8-18/2 * * *", defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 9, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 0, 0),
    );
  });

  test("day-of-week only (dayOfMonth wildcard): weekday range, rolls over the weekend", () => {
    const parsed = parseCronExpression("0 9 * * MON-FRI", defaultCalendarScheme);
    // 2024-01-06 is a Saturday, 2024-01-08 is the following Monday.
    const from = Date.UTC(2024, 0, 6, 10, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 8, 9, 0, 0),
    );
  });

  test("day-of-month only (dayOfWeek wildcard): monthly on a fixed day", () => {
    const parsed = parseCronExpression("0 0 15 * *", defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 20, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 1, 15, 0, 0, 0),
    );
  });

  test("month restriction, by name list", () => {
    const parsed = parseCronExpression("0 0 1 JAN,JUL *", defaultCalendarScheme);
    const from = Date.UTC(2024, 2, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 6, 1, 0, 0, 0),
    );
  });

  test("day-of-week alias 7 (Sunday)", () => {
    const parsed = parseCronExpression("0 0 * * 7", defaultCalendarScheme);
    // 2024-01-01 is a Monday, the next Sunday is 2024-01-07.
    const from = Date.UTC(2024, 0, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 7, 0, 0, 0),
    );
  });

  test("POSIX OR-quirk: both day-of-month and day-of-week restricted matches on either", () => {
    const parsed = parseCronExpression("0 0 1,15 * MON", defaultCalendarScheme);
    // 2024-01-02 is a Tuesday; the nearer of "next Monday" (01-08) and "the 15th" is 01-08.
    const from = Date.UTC(2024, 0, 2, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 8, 0, 0, 0),
    );
  });

  test("throws when the expression can never match", () => {
    const parsed = parseCronExpression("0 0 31 2 *", defaultCalendarScheme);
    expect(() =>
      computeNextOccurrence(parsed, Date.UTC(2024, 0, 1), utc, defaultCalendarScheme),
    ).toThrow(/No matching cron occurrence found/);
  });

  test("resolves a leap-day-only expression across a century-boundary gap (up to 8 years)", () => {
    const parsed = parseCronExpression("0 0 29 2 *", defaultCalendarScheme);
    // 2100 isn't a leap year (divisible by 100 but not 400), so the gap from 2096-02-29 to the
    // next Feb 29 (2104) is 8 years - close to, but within, the 10-year search bound.
    const from = Date.UTC(2096, 2, 1, 0, 0, 0); // just after 2096-02-29
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2104, 1, 29, 0, 0, 0),
    );
  });

  describe("timezone handling", () => {
    test("resolves a fixed local time-of-day against a non-UTC offset", () => {
      const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
      // Well before the 2024 spring-forward transition, Europe/Paris is UTC+1 (CET).
      const from = Date.UTC(2024, 2, 25, 10, 0, 0);
      expect(computeNextOccurrence(parsed, from, "Europe/Paris", defaultCalendarScheme)).toBe(
        Date.UTC(2024, 2, 26, 8, 0, 0),
      );
    });

    test("resolves correctly across a DST spring-forward transition", () => {
      const parsed = parseCronExpression("0 9 * * *", defaultCalendarScheme);
      // 2024-03-31 is the Europe/Paris spring-forward day: from 01:00 UTC onward the
      // local offset shifts from UTC+1 (CET) to UTC+2 (CEST).
      const from = Date.UTC(2024, 2, 30, 10, 0, 0);
      expect(computeNextOccurrence(parsed, from, "Europe/Paris", defaultCalendarScheme)).toBe(
        Date.UTC(2024, 2, 31, 7, 0, 0),
      );
    });

    test("a wall-clock time inside a spring-forward gap resolves past the gap, deterministically", () => {
      const parsed = parseCronExpression("30 2 * * *", defaultCalendarScheme);
      // 2024-03-31 02:00-03:00 Europe/Paris never occurs (clocks jump straight to 03:00 CEST) -
      // 02:30 resolves to 03:30 CEST, the same 30 minutes past the gap's end.
      const from = Date.UTC(2024, 2, 30, 10, 0, 0);
      expect(computeNextOccurrence(parsed, from, "Europe/Paris", defaultCalendarScheme)).toBe(
        Date.UTC(2024, 2, 31, 1, 30, 0),
      );
    });

    test("a time earlier in the spring-forward day, before the transition itself, is unaffected", () => {
      const parsed = parseCronExpression("30 0 * * *", defaultCalendarScheme);
      // 2024-03-31 00:30 Europe/Paris is well before that day's 02:00 transition - still CET.
      const from = Date.UTC(2024, 2, 30, 10, 0, 0);
      expect(computeNextOccurrence(parsed, from, "Europe/Paris", defaultCalendarScheme)).toBe(
        Date.UTC(2024, 2, 30, 23, 30, 0),
      );
    });

    test("a wall-clock time inside a fall-back overlap resolves to the earlier occurrence, deterministically", () => {
      const parsed = parseCronExpression("30 2 * * *", defaultCalendarScheme);
      // 2024-10-27 02:00-03:00 Europe/Paris occurs twice (once CEST, once CET) - resolves to the
      // earlier (CEST) one.
      const from = Date.UTC(2024, 9, 26, 10, 0, 0);
      expect(computeNextOccurrence(parsed, from, "Europe/Paris", defaultCalendarScheme)).toBe(
        Date.UTC(2024, 9, 27, 0, 30, 0),
      );
    });
  });
});

describe("parseCronSpec", () => {
  const utc = "Etc/UTC";

  test("all fields omitted default to every value (equivalent to * * * * *)", () => {
    const parsed = parseCronSpec({}, defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 30, 15);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 31, 0),
    );
  });

  test("an explicit * field is equivalent to omitting it", () => {
    const parsed = parseCronSpec(
      { minute: "*", hour: "*", dayOfMonth: "*", month: "*" },
      defaultCalendarScheme,
    );
    const from = Date.UTC(2024, 0, 1, 10, 30, 15);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 31, 0),
    );
  });

  test("a bare number restricts the field to a single value", () => {
    const parsed = parseCronSpec({ minute: 30, hour: 9 }, defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 8, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 9, 30, 0),
    );
  });

  test("a bare name string restricts the field to a single named value", () => {
    const parsed = parseCronSpec({ month: "JUL", dayOfMonth: 1 }, defaultCalendarScheme);
    const from = Date.UTC(2024, 2, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 6, 1, 0, 0, 0),
    );
  });

  test("a bare numeric string resolves the same as the equivalent number", () => {
    const parsed = parseCronSpec({ minute: "30" }, defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 20, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 30, 0),
    );
  });

  test("an array of numbers is a list of allowed values", () => {
    const parsed = parseCronSpec({ minute: [0, 15, 30, 45] }, defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 20, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 30, 0),
    );
  });

  test("a range object expands from-to inclusive with a default step of 1", () => {
    const parsed = parseCronSpec({ minute: [{ from: 10, to: 12 }] }, defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 1, 10, 5, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 10, 0),
    );
  });

  test("a range object honors an explicit step", () => {
    const parsed = parseCronSpec(
      { minute: [{ from: 0, to: 30, step: 10 }] },
      defaultCalendarScheme,
    );
    const from = Date.UTC(2024, 0, 1, 10, 5, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 1, 10, 10, 0),
    );
  });

  test("a range object accepts names for from/to", () => {
    const parsed = parseCronSpec(
      { month: [{ from: "JAN", to: "MAR" }], dayOfMonth: 1 },
      defaultCalendarScheme,
    );
    const from = Date.UTC(2024, 3, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2025, 0, 1, 0, 0, 0),
    );
  });

  test("a month range accepts plain numbers for from/to", () => {
    const parsed = parseCronSpec(
      { month: { from: 1, to: 3 }, dayOfMonth: 1 },
      defaultCalendarScheme,
    );
    const from = Date.UTC(2024, 3, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2025, 0, 1, 0, 0, 0),
    );
  });

  test("a month range can mix a name for from and a number for to", () => {
    const parsed = parseCronSpec(
      { month: { from: "JAN", to: 3 }, dayOfMonth: 1 },
      defaultCalendarScheme,
    );
    const from = Date.UTC(2024, 3, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2025, 0, 1, 0, 0, 0),
    );
  });

  test("a month range can mix a number for from and a name for to", () => {
    const parsed = parseCronSpec(
      { month: { from: 1, to: "MAR" }, dayOfMonth: 1 },
      defaultCalendarScheme,
    );
    const from = Date.UTC(2024, 3, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2025, 0, 1, 0, 0, 0),
    );
  });

  test("a dayOfWeek range can mix a name for from and a number for to", () => {
    const parsed = parseCronSpec(
      { dayOfWeek: { from: "MON", to: 5 }, hour: 9, minute: 0 },
      defaultCalendarScheme,
    );
    // 2024-01-06 is a Saturday, 2024-01-08 is the following Monday.
    const from = Date.UTC(2024, 0, 6, 10, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 8, 9, 0, 0),
    );
  });

  test("a dayOfWeek range can mix a number for from and a name for to", () => {
    const parsed = parseCronSpec(
      { dayOfWeek: { from: 1, to: "FRI" }, hour: 9, minute: 0 },
      defaultCalendarScheme,
    );
    // 2024-01-06 is a Saturday, 2024-01-08 is the following Monday.
    const from = Date.UTC(2024, 0, 6, 10, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 8, 9, 0, 0),
    );
  });

  test("a dayOfMonth range accepts plain numbers for from/to", () => {
    const parsed = parseCronSpec({ dayOfMonth: { from: 10, to: 15 } }, defaultCalendarScheme);
    const from = Date.UTC(2024, 0, 20, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 1, 10, 0, 0, 0),
    );
  });

  test("a bare range object (not wrapped in an array) is accepted directly", () => {
    const parsed = parseCronSpec(
      {
        dayOfWeek: { from: "MON", to: "WED" },
        hour: { from: 1, to: 2 },
      },
      defaultCalendarScheme,
    );
    // 2024-01-07 is a Sunday; the next match is Monday 2024-01-08 at 01:00.
    const from = Date.UTC(2024, 0, 7, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 8, 1, 0, 0),
    );
  });

  test("an array can mix numbers, names, and ranges", () => {
    const parsed = parseCronSpec(
      {
        minute: 0,
        hour: 0,
        dayOfWeek: ["MON", 3, { from: 5, to: 6 }],
      },
      defaultCalendarScheme,
    );
    // 2024-01-01 is a Monday, already past midnight; the next match (Mon/Wed/Fri/Sat at
    // midnight) is Wednesday 2024-01-03.
    const from = Date.UTC(2024, 0, 1, 10, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 3, 0, 0, 0),
    );
  });

  test("day-of-week 7 (numeric) is normalized to the Sunday alias 0", () => {
    const parsed = parseCronSpec({ dayOfWeek: 7 }, defaultCalendarScheme);
    // 2024-01-01 is a Monday, the next Sunday is 2024-01-07.
    const from = Date.UTC(2024, 0, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 7, 0, 0, 0),
    );
  });

  test("day-of-week 7 inside a range is also normalized", () => {
    const parsed = parseCronSpec({ dayOfWeek: [{ from: 6, to: 7 }] }, defaultCalendarScheme);
    // 2024-01-01 is a Monday; the nearer of the next Saturday (01-06) and Sunday (01-07) is
    // Saturday.
    const from = Date.UTC(2024, 0, 1, 0, 0, 0);
    expect(computeNextOccurrence(parsed, from, utc, defaultCalendarScheme)).toBe(
      Date.UTC(2024, 0, 6, 0, 0, 0),
    );
  });

  test("throws for a non-integer number", () => {
    expect(() => parseCronSpec({ minute: 1.5 }, defaultCalendarScheme)).toThrow(
      /not a valid value/,
    );
  });

  test("throws for a number out of range", () => {
    expect(() => parseCronSpec({ minute: 60 }, defaultCalendarScheme)).toThrow(/out of range/);
  });

  test("throws for an unrecognized name", () => {
    // "FOO" is rejected by ICronSpec's type already (see below) - cast to simulate an untyped
    // caller reaching the same runtime validation.
    expect(() =>
      parseCronSpec({ month: "FOO" } as unknown as ICronSpec, defaultCalendarScheme),
    ).toThrow(/not a valid value/);
  });

  test("throws for an empty string atom", () => {
    expect(() =>
      parseCronSpec({ minute: "" } as unknown as ICronSpec, defaultCalendarScheme),
    ).toThrow(/not a valid value/);
  });

  test("throws for a whitespace-only string atom, instead of silently resolving to 0", () => {
    expect(() =>
      parseCronSpec({ minute: "  " } as unknown as ICronSpec, defaultCalendarScheme),
    ).toThrow(/not a valid value/);
  });

  test.each(["0x1E", "1e1", "0o17", "0b101", "1.5"])(
    "throws for a JS numeric-literal-syntax string atom that isn't a plain decimal integer (%s)",
    (atom) => {
      expect(() =>
        parseCronSpec({ minute: atom } as unknown as ICronSpec, defaultCalendarScheme),
      ).toThrow(/not a valid value/);
    },
  );

  test("throws for a numeric string out of range", () => {
    expect(() => parseCronSpec({ minute: "60" }, defaultCalendarScheme)).toThrow(/out of range/);
  });

  test("throws for a range given in the wrong order", () => {
    expect(() => parseCronSpec({ hour: [{ from: 10, to: 5 }] }, defaultCalendarScheme)).toThrow(
      /out of order/,
    );
  });

  test("throws for a non-positive step", () => {
    expect(() =>
      parseCronSpec({ minute: [{ from: 0, to: 10, step: 0 }] }, defaultCalendarScheme),
    ).toThrow(/not valid/);
  });

  test("throws for a non-integer step", () => {
    expect(() =>
      parseCronSpec({ minute: [{ from: 0, to: 10, step: 1.5 }] }, defaultCalendarScheme),
    ).toThrow(/not valid/);
  });
});

describe("ICronSpec field types reject a name/value that doesn't belong to that field", () => {
  describe("bare field value", () => {
    test("minute rejects a month name", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "JAN" is a MonthName, not valid for the numeric `minute` field
            minute: "JAN",
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("dayOfWeek rejects a month name", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "JAN" is a MonthName, not a DayOfWeekName
            dayOfWeek: "JAN",
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("month rejects a day-of-week name", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "MON" is a DayOfWeekName, not a MonthName
            month: "MON",
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });
  });

  describe("numeric fields (minute/hour/dayOfMonth) - range endpoints only accept a number or a numeric string", () => {
    test("rejects a name on `from`", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "MON" is a DayOfWeekName, not valid for the numeric `hour` field
            hour: { from: "MON", to: 2, step: 1 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("rejects a name on `to`", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "MON" is a DayOfWeekName, not valid for the numeric `hour` field
            hour: { from: 1, to: "MON" },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("accepts a numeric string on `from`, resolving the same as the equivalent number", () => {
      const withString = parseCronSpec({ hour: { from: "1", to: 5 } }, defaultCalendarScheme);
      const withNumber = parseCronSpec({ hour: { from: 1, to: 5 } }, defaultCalendarScheme);
      const from = Date.UTC(2024, 0, 1, 0, 0, 0);
      expect(computeNextOccurrence(withString, from, "Etc/UTC", defaultCalendarScheme)).toBe(
        computeNextOccurrence(withNumber, from, "Etc/UTC", defaultCalendarScheme),
      );
    });

    test("accepts a numeric string on `to`, resolving the same as the equivalent number", () => {
      const withString = parseCronSpec({ hour: { from: 1, to: "5" } }, defaultCalendarScheme);
      const withNumber = parseCronSpec({ hour: { from: 1, to: 5 } }, defaultCalendarScheme);
      const from = Date.UTC(2024, 0, 1, 0, 0, 0);
      expect(computeNextOccurrence(withString, from, "Etc/UTC", defaultCalendarScheme)).toBe(
        computeNextOccurrence(withNumber, from, "Etc/UTC", defaultCalendarScheme),
      );
    });

    test("rejects a non-numeric string on `from`", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "A" is not a NumericString, and not a valid name for a numeric field
            hour: { from: "A", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("rejects a non-numeric string on `to`", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "A" is not a NumericString, and not a valid name for a numeric field
            hour: { from: 1, to: "A" },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test('rejects "*" on `from`', () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "*" is only valid as a whole field value, not a range endpoint
            hour: { from: "*", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test('rejects "*" on `to`', () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "*" is only valid as a whole field value, not a range endpoint
            hour: { from: 1, to: "*" },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("dayOfMonth rejects a name", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "MON" is a DayOfWeekName, not valid for the numeric `dayOfMonth` field
            dayOfMonth: { from: "MON", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });
  });

  describe("month field - range endpoints only accept a number or a MonthName", () => {
    test("rejects a day-of-week name on `from`", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "MON" is a DayOfWeekName, not a MonthName
            month: { from: "MON", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("rejects a day-of-week name on `to`", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "MON" is a DayOfWeekName, not a MonthName
            month: { from: 1, to: "MON" },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("accepts a numeric string, resolving the same as the equivalent number", () => {
      const withString = parseCronSpec({ month: { from: "1", to: 5 } }, defaultCalendarScheme);
      const withNumber = parseCronSpec({ month: { from: 1, to: 5 } }, defaultCalendarScheme);
      const from = Date.UTC(2024, 3, 1, 0, 0, 0);
      expect(computeNextOccurrence(withString, from, "Etc/UTC", defaultCalendarScheme)).toBe(
        computeNextOccurrence(withNumber, from, "Etc/UTC", defaultCalendarScheme),
      );
    });

    test("rejects a non-numeric, non-name string", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "A" is not a NumericString, and not a MonthName
            month: { from: "A", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test('rejects "*" as a range endpoint', () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "*" is only valid as a whole field value, not a range endpoint
            month: { from: "*", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });
  });

  describe("dayOfWeek field - range endpoints only accept a number or a DayOfWeekName", () => {
    test("rejects a month name on `from`", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "JAN" is a MonthName, not a DayOfWeekName
            dayOfWeek: { from: "JAN", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("rejects a month name on `to`", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "JAN" is a MonthName, not a DayOfWeekName
            dayOfWeek: { from: 1, to: "JAN" },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test("accepts a numeric string, resolving the same as the equivalent number", () => {
      const withString = parseCronSpec({ dayOfWeek: { from: "1", to: 5 } }, defaultCalendarScheme);
      const withNumber = parseCronSpec({ dayOfWeek: { from: 1, to: 5 } }, defaultCalendarScheme);
      const from = Date.UTC(2024, 0, 1, 0, 0, 0);
      expect(computeNextOccurrence(withString, from, "Etc/UTC", defaultCalendarScheme)).toBe(
        computeNextOccurrence(withNumber, from, "Etc/UTC", defaultCalendarScheme),
      );
    });

    test("rejects a non-numeric, non-name string", () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "A" is not a NumericString, and not a DayOfWeekName
            dayOfWeek: { from: "A", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });

    test('rejects "*" as a range endpoint', () => {
      expect(() =>
        parseCronSpec(
          {
            //@ts-expect-error: "*" is only valid as a whole field value, not a range endpoint
            dayOfWeek: { from: "*", to: 5 },
          },
          defaultCalendarScheme,
        ),
      ).toThrow();
    });
  });
});

describe("cronExpressionToSpec", () => {
  test("represents a wildcard field as the string *", () => {
    const spec = cronExpressionToSpec("* * * * *", defaultCalendarScheme);
    expect(spec).toEqual({
      minute: "*",
      hour: "*",
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "*",
    });
  });

  test("represents a restricted field as a sorted array of numbers", () => {
    const spec = cronExpressionToSpec("15,0,45,30 9 * * *", defaultCalendarScheme);
    expect(spec.minute).toEqual([0, 15, 30, 45]);
    expect(spec.hour).toEqual([9]);
  });

  test("round-trips to the same next occurrence as the original expression", () => {
    const expression = "0 9 * * MON-FRI";
    const spec = cronExpressionToSpec(expression, defaultCalendarScheme);
    const fromText = parseCronExpression(expression, defaultCalendarScheme);
    const fromSpec = parseCronSpec(spec, defaultCalendarScheme);
    // 2024-01-06 is a Saturday.
    const from = Date.UTC(2024, 0, 6, 10, 0, 0);
    expect(computeNextOccurrence(fromSpec, from, "Etc/UTC", defaultCalendarScheme)).toBe(
      computeNextOccurrence(fromText, from, "Etc/UTC", defaultCalendarScheme),
    );
  });
});
