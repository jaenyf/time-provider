import type {
  CalendarSchemeFields,
  ComposableCalendarSchemeFields,
  ICalendarScheme,
  ITimeConverter,
  TimezoneDefinition,
} from "../types/types.ts";
import { CalendarSchemeFieldsHelper } from "./calendar-fields-helper.ts";
import {
  DEFAULT_CALENDAR_SCHEME_MONTH_NAMES,
  DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES,
  type DefaultCalendarSchemeMonthName,
  type DefaultCalendarSchemeWeekdayName,
} from "./default-calendar-scheme-names.ts";
import { IntlFormatterCache } from "./intl-formatter-cache.ts";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The default shared Gregorian/`Intl` {@link ICalendarScheme} every plugin gets unless it provides its
 * own - see {@link ITimeConverter.calendarScheme}.
 */
export class DefaultCalendarScheme<TDate> implements ICalendarScheme<
  TDate,
  DefaultCalendarSchemeMonthName,
  DefaultCalendarSchemeWeekdayName
> {
  /*
    Note: `Date` is only used here to perform pure calendar arithmetics.
  */
  #converter: ITimeConverter<TDate>;

  readonly monthNames: readonly DefaultCalendarSchemeMonthName[] =
    DEFAULT_CALENDAR_SCHEME_MONTH_NAMES;
  readonly weekdayNames: readonly DefaultCalendarSchemeWeekdayName[] =
    DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES;

  constructor(converter: ITimeConverter<TDate>) {
    this.#converter = converter;
  }

  toTimestamp(date: TDate): number {
    return this.#converter.convertToTimestamp(date);
  }
  fromTimestamp(timestampMs: number): TDate {
    return this.#converter.convertToUtcDate(timestampMs);
  }
  minutesPerHour(): number {
    return 60;
  }
  hoursPerDay(): number {
    return 24;
  }
  daysPerWeek(): number {
    return 7;
  }
  monthsPerYear(): number {
    return 12;
  }
  maxDayOfMonth(): number {
    return 31;
  }

  normalize(fields: ComposableCalendarSchemeFields): CalendarSchemeFields {
    const date = new Date(DefaultCalendarScheme.#fieldsAsUtcMs(fields));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      weekday: date.getUTCDay(),
    };
  }

  decompose(date: TDate, timezone: TimezoneDefinition): CalendarSchemeFields {
    return DefaultCalendarScheme.#decomposeAt(this.#converter.convertToTimestamp(date), timezone);
  }

  compose(fields: ComposableCalendarSchemeFields, timezone: TimezoneDefinition): TDate {
    return this.#converter.convertToUtcDate(DefaultCalendarScheme.#composeAt(fields, timezone));
  }

  /**
   * Treats `fields` as UTC and lets `Date.UTC`'s own calendar math carry any overflow (e.g. minute
   * 60, or month 13) - a pure Gregorian calendar calculator, unrelated to any real timezone.
   */
  static #fieldsAsUtcMs(fields: ComposableCalendarSchemeFields): number {
    return Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute);
  }

  /** The wall-clock fields `timestampMs` represents in `timezone`, per the host's ICU data. */
  static #decomposeAt(timestampMs: number, timezone: string): CalendarSchemeFields {
    const parts = IntlFormatterCache.wallClockFormatter(timezone).formatToParts(
      new Date(timestampMs),
    );
    const get = (type: string): number => Number(parts.find((part) => part.type === type)!.value);
    const year = get("year");
    const month = get("month");
    const day = get("day");
    return {
      year,
      month,
      day,
      // some ICU/hourCycle combinations render midnight as "24" instead of "00"
      hour: get("hour") % 24,
      minute: get("minute"),
      weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    };
  }

  /**
   * The UTC offset (in ms, east-positive) `timezone` observes at real instant `instant` - how far
   * `instant`'s own wall-clock reading, naively re-interpreted as UTC, sits from `instant` itself.
   */
  static #offsetAt(instant: number, timezone: string): number {
    return (
      DefaultCalendarScheme.#fieldsAsUtcMs(DefaultCalendarScheme.#decomposeAt(instant, timezone)) -
      instant
    );
  }

  /**
   * Resolves `fields` (intended as local time in `timezone`) to the epoch timestamp it represents.
   * Real IANA timezones never carry two DST transitions within a couple of days of each other, so
   * sampling the offset a full day on either side of `fields`' naive "treat it as UTC" guess safely
   * brackets whichever single transition (if any) could be in play right around `fields` itself.
   * When both offsets agree, there's no transition nearby and the instant is unambiguous. When they
   * don't, `fields` sits on the transition itself - checking which offset(s) actually produce
   * `fields` back (not just picking whichever the arithmetic happens to reach first) tells them
   * apart:
   * - if *neither* candidate reads back as `fields`, it's a "spring forward" gap (`fields` never
   *   occurs) - resolves to the later of the two, the first valid instant once the new offset takes
   *   effect.
   * - if *both* do, it's a "fall back" overlap (`fields` occurs twice) - resolves to the earlier of
   *   the two, the first time it's valid.
   */
  static #composeAt(fields: ComposableCalendarSchemeFields, timezone: string): number {
    const target = DefaultCalendarScheme.#fieldsAsUtcMs(fields);
    const offsetBefore = DefaultCalendarScheme.#offsetAt(target - ONE_DAY_MS, timezone);
    const offsetAfter = DefaultCalendarScheme.#offsetAt(target + ONE_DAY_MS, timezone);

    if (offsetBefore === offsetAfter) {
      return target - offsetBefore;
    }

    const candidateBefore = target - offsetBefore;
    const candidateAfter = target - offsetAfter;
    const roundTripsBefore = CalendarSchemeFieldsHelper.equals(
      DefaultCalendarScheme.#decomposeAt(candidateBefore, timezone),
      fields,
    );
    const roundTripsAfter = CalendarSchemeFieldsHelper.equals(
      DefaultCalendarScheme.#decomposeAt(candidateAfter, timezone),
      fields,
    );

    if (roundTripsBefore && !roundTripsAfter) {
      return candidateBefore;
    }
    if (roundTripsAfter && !roundTripsBefore) {
      return candidateAfter;
    }
    return roundTripsBefore && roundTripsAfter
      ? Math.min(candidateBefore, candidateAfter) // fall-back overlap: the earlier of the two.
      : Math.max(candidateBefore, candidateAfter); // spring-forward gap: past the gap.
  }
}
