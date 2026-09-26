import { TimeInputValidator, toInstant, type TimezoneDefinition } from "@time-provider/core";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp = (time: string | number | Date) =>
    toInstant({ milliseconds: RuntimeHelper.convertToUtcDate(time).getTime() });

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
   * Returns the number of days in `date`'s UTC month, for clamping month/year arithmetic.
   */
  /* @__INLINE__ */
  static daysInMonth(date: Date): number {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  }
}
