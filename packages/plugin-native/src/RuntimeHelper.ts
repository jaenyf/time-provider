import { TimeInputValidator } from "@time-provider/core";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp = (time: string | number | Date) =>
    RuntimeHelper.convertToDate(time).getTime();

  /* @__INLINE__ */
  static convertToDate = (time: string | number | Date) => {
    TimeInputValidator.assertValid(time);
    const result = new Date(time);
    if (Number.isNaN(result.getTime())) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    return result;
  };
}
