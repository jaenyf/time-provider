import { TimeInputValidator, type TimezoneDefinition } from "@time-provider/core";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp = (time: string | number | Date) =>
    RuntimeHelper.convertToUtcDate(time).getTime();

  /* @__INLINE__ */
  static convertToUtcDate = (time: string | number | Date) => {
    TimeInputValidator.assertValid(time);
    const result = new Date(time);
    if (Number.isNaN(result.getTime())) {
      TimeInputValidator.throwInvalidTimeValue(time);
    }
    return result;
  };
  /* @__INLINE__ */
  static convertToLocalDate(_timezone: TimezoneDefinition, _time: string | number | Date): Date {
    throw new Error("Operation not supported");
  }
  /**
   * Number of days in `date`'s (UTC) month, used to clamp day-of-month when advancing/going back by
   * months or years so e.g. Jan 31 + 1 month lands on Feb 28, matching every other plugin's
   * calendar-aware arithmetic instead of native `Date`'s day-overflow behavior.
   */
  /* @__INLINE__ */
  static daysInMonth(date: Date): number {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  }
}
