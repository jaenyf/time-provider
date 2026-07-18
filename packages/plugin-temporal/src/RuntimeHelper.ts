import { Temporal } from "@js-temporal/polyfill";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | Temporal.Instant): number {
    return RuntimeHelper.convertToDate(time).epochMilliseconds;
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | Temporal.Instant): Temporal.Instant {
    if (time === undefined || time === null || (typeof time === "number" && Number.isNaN(time))) {
      throw new Error(`Invalid time value (value was '${String(time)}')`);
    }
    if (typeof time === "number") return Temporal.Instant.fromEpochMilliseconds(time);
    return Temporal.Instant.from(time);
  }
}
