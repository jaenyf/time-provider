export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp = (time: string | number | Date) =>
    RuntimeHelper.convertToDate(time).getTime();

  /* @__INLINE__ */
  static convertToDate = (time: string | number | Date) => {
    if (time === undefined || time === null || (typeof time === "number" && Number.isNaN(time))) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    const result = new Date(time);
    if (Number.isNaN(result.getTime())) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    return result;
  };
}
