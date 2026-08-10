/**
 * The month names {@link DefaultCalendarScheme} accepts, in calendar order - index 0 is the
 * first month. Lives in its own module so {@link ICalendarScheme}'s type parameters can default
 * to these names without `types.ts` (pure type-only contracts) depending on adapter code.
 */
export const DEFAULT_CALENDAR_SCHEME_MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;
/** A month name of the default Gregorian calendar - see {@link DEFAULT_CALENDAR_SCHEME_MONTH_NAMES}. */
export type DefaultCalendarSchemeMonthName = (typeof DEFAULT_CALENDAR_SCHEME_MONTH_NAMES)[number];

/** The weekday names {@link DefaultCalendarScheme} accepts, in calendar order (index 0 = Sunday). */
export const DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;
/** A weekday name of the default Gregorian calendar - see {@link DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES}. */
export type DefaultCalendarSchemeWeekdayName =
  (typeof DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES)[number];
