/**
 * The month names {@link DefaultCalendarAdapter} accepts, in calendar order - index 0 is the
 * first month. Lives in its own module so {@link ICalendarAdapter}'s type parameters can default
 * to these names without `types.ts` (pure type-only contracts) depending on adapter code.
 */
export const GREGORIAN_MONTH_NAMES = [
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
/** A month name of the Gregorian calendar - see {@link GREGORIAN_MONTH_NAMES}. */
export type GregorianMonthName = (typeof GREGORIAN_MONTH_NAMES)[number];

/** The weekday names {@link DefaultCalendarAdapter} accepts, in calendar order (index 0 = Sunday). */
export const GREGORIAN_WEEKDAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
/** A weekday name of the Gregorian calendar - see {@link GREGORIAN_WEEKDAY_NAMES}. */
export type GregorianWeekdayName = (typeof GREGORIAN_WEEKDAY_NAMES)[number];
