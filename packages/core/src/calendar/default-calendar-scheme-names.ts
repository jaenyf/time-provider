/** Default Gregorian month names, in calendar order. */
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

/** A default Gregorian month name. */
export type DefaultCalendarSchemeMonthName = (typeof DEFAULT_CALENDAR_SCHEME_MONTH_NAMES)[number];

/** Default Gregorian weekday names, starting with Sunday. */
export const DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;

/** A default Gregorian weekday name. */
export type DefaultCalendarSchemeWeekdayName =
  (typeof DEFAULT_CALENDAR_SCHEME_WEEKDAY_NAMES)[number];
