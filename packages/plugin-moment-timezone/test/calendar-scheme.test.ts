import { describe, expect, test } from "vite-plus/test";
import { DefaultCalendarScheme } from "@time-provider/core";
import moment from "moment-timezone";
import { RuntimeHelper } from "../src/plugin/runtime-helper.ts";
import { MomentTimezoneCalendarScheme } from "../src/plugin/calendar-scheme.ts";
import { toInstant } from "@time-provider/core";

const sut = RuntimeHelper.calendarScheme;
/** What a runtime would have used before this plugin supplied its own - the host's ICU. */
const defaultCalendarScheme = new DefaultCalendarScheme(RuntimeHelper);

/*
 * A zone where moment-timezone's bundled tzdata and the host's ICU genuinely disagree. Morocco
 * suspends DST for Ramadan and the exact dates move every year, so the two datasets drift apart
 * whenever one is refreshed before the other - the case this whole adapter exists for.
 */
const DIVERGENT_ZONE = "Africa/Casablanca";
const DIVERGENT_INSTANT = toInstant({ milliseconds: Date.UTC(2026, 10, 15, 12, 0, 0) });

describe("MomentTimezoneCalendarScheme", () => {
  test("is the adapter the plugin's converter hands to a runtime", () => {
    expect(sut).toBeInstanceOf(MomentTimezoneCalendarScheme);
  });

  describe("resolves wall-clock time against moment-timezone's tzdata, not the host's ICU", () => {
    test("decompose agrees with moment-timezone for a zone the two datasets disagree on", () => {
      const viaMoment = moment.tz(DIVERGENT_INSTANT, DIVERGENT_ZONE);
      const fields = sut.decompose(moment.utc(DIVERGENT_INSTANT), DIVERGENT_ZONE);

      expect(fields).toEqual({
        year: viaMoment.year(),
        month: viaMoment.month() + 1,
        day: viaMoment.date(),
        hour: viaMoment.hour(),
        minute: viaMoment.minute(),
        weekday: viaMoment.day(),
      });
    });

    test("the two adapters really do differ here, so the override is observable", () => {
      // Guards the test above from silently becoming vacuous if the datasets ever converge:
      // should that happen this fails loudly rather than asserting nothing.
      const mine = sut.decompose(moment.utc(DIVERGENT_INSTANT), DIVERGENT_ZONE);
      const icu = defaultCalendarScheme.decompose(moment.utc(DIVERGENT_INSTANT), DIVERGENT_ZONE);
      expect(mine.hour).not.toBe(icu.hour);
    });

    test("compose round-trips its own decompose in the divergent zone", () => {
      const fields = sut.decompose(moment.utc(DIVERGENT_INSTANT), DIVERGENT_ZONE);
      const { year, month, day, hour, minute } = fields;
      expect(sut.compose({ year, month, day, hour, minute }, DIVERGENT_ZONE).valueOf()).toBe(
        DIVERGENT_INSTANT,
      );
    });
  });

  describe("DST resolution matches the shared contract", () => {
    const paris = "Europe/Paris";

    test("a spring-forward gap resolves to the first instant past it", () => {
      // 2024-03-31 02:30 never happens in Paris; 03:30 CEST is 01:30Z.
      const composed = sut.compose({ year: 2024, month: 3, day: 31, hour: 2, minute: 30 }, paris);
      expect(composed.toISOString()).toBe("2024-03-31T01:30:00.000Z");
    });

    test("a fall-back overlap resolves to the earlier of the two occurrences", () => {
      // 2024-10-27 02:30 happens twice in Paris; the earlier (CEST) is 00:30Z.
      const composed = sut.compose({ year: 2024, month: 10, day: 27, hour: 2, minute: 30 }, paris);
      expect(composed.toISOString()).toBe("2024-10-27T00:30:00.000Z");
    });
  });

  describe("everything that isn't timezone-dependent stays on the shared default", () => {
    test("reports the Gregorian unit sizes and names", () => {
      expect(sut.minutesPerHour()).toBe(60);
      expect(sut.hoursPerDay()).toBe(24);
      expect(sut.daysPerWeek()).toBe(7);
      expect(sut.monthsPerYear()).toBe(12);
      expect(sut.maxDayOfMonth()).toBe(31);
      expect(sut.monthNames[0]).toBe("JAN");
      expect(sut.weekdayNames[0]).toBe("SUN");
    });

    test("normalize carries out-of-range fields, which moment's own object form would not", () => {
      // `moment.utc({ minute: 60 })` is an *invalid* moment rather than 01:00 the next hour, so
      // normalize has to stay on the inherited arithmetic.
      expect(sut.normalize({ year: 2024, month: 1, day: 1, hour: 0, minute: 60 })).toMatchObject({
        hour: 1,
        minute: 0,
      });
      expect(sut.normalize({ year: 2024, month: 13, day: 1, hour: 0, minute: 0 })).toMatchObject({
        year: 2025,
        month: 1,
      });
    });

    test("toTimestamp/fromTimestamp go through the plugin's own converter", () => {
      expect(sut.toTimestamp(moment.utc(DIVERGENT_INSTANT))).toBe(DIVERGENT_INSTANT);
      expect(sut.fromTimestamp(DIVERGENT_INSTANT).valueOf()).toBe(DIVERGENT_INSTANT);
    });
  });
});
