import { toInstant } from "../helpers/branded-types.ts";
import type {
  CalendarSchemeFields,
  ComposableCalendarSchemeFields,
  EpochMilliseconds,
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

/** Default shared Gregorian/`Intl` {@link ICalendarScheme}. */
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

  toTimestamp(date: TDate): EpochMilliseconds {
    return this.#converter.convertToTimestamp(date);
  }
  fromTimestamp(timestampMs: EpochMilliseconds): TDate {
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

  /** Treats `fields` as UTC and applies Gregorian overflow. */
  static #fieldsAsUtcMs(fields: ComposableCalendarSchemeFields): number {
    return Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute);
  }

  /** Returns the wall-clock fields at `timestampMs` in `timezone`. */
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

  /** Returns the UTC offset observed by `timezone` at `instant`. */
  static #offsetAt(instant: number, timezone: string): number {
    return (
      DefaultCalendarScheme.#fieldsAsUtcMs(DefaultCalendarScheme.#decomposeAt(instant, timezone)) -
      instant
    );
  }

  /** Resolves local `fields` in `timezone` to an epoch timestamp. */
  static #composeAt(fields: ComposableCalendarSchemeFields, timezone: string): EpochMilliseconds {
    const target = DefaultCalendarScheme.#fieldsAsUtcMs(fields);
    const offsetBefore = DefaultCalendarScheme.#offsetAt(target - ONE_DAY_MS, timezone);
    const offsetAfter = DefaultCalendarScheme.#offsetAt(target + ONE_DAY_MS, timezone);

    if (offsetBefore === offsetAfter) {
      return toInstant({ milliseconds: target - offsetBefore });
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
      return toInstant({ milliseconds: candidateBefore });
    }
    if (roundTripsAfter && !roundTripsBefore) {
      return toInstant({ milliseconds: candidateAfter });
    }
    return toInstant({
      milliseconds:
        roundTripsBefore && roundTripsAfter
          ? Math.min(candidateBefore, candidateAfter) // fall-back overlap: the earlier of the two.
          : Math.max(candidateBefore, candidateAfter),
    }); // spring-forward gap: past the gap.
  }
}
