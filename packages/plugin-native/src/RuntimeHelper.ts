export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp = (time: string | number | Date) => new Date(time).getTime();

  /* @__INLINE__ */
  static convertToDate = (time: string | number | Date) => new Date(time);
}
