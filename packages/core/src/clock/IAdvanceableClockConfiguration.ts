/**
 * Describe the time elements to manually advance.
 *
 * Note: When more than one element is set, they are applied to the current time in a
 * fixed order :  years, months,days, hours, minutes, seconds, milliseconds.
 * This order is important because, for calendar-variable elements (`months`, `years`), combining them with other
 * elements can give a different result than a different application order would.
 */
export interface IAdvanceableClockConfiguration {
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  years?: number;
  months?: number;
  days?: number;
}
