import { Temporal } from "@js-temporal/polyfill";

export class RuntimeHelper {
  /* @__INLINE__ */
  static convertToTimestamp(time: string | number | Temporal.Instant): number {
    return RuntimeHelper.convertToDate(time).epochMilliseconds;
  }
  /* @__INLINE__ */
  static convertToDate(time: string | number | Temporal.Instant): Temporal.Instant {
    if (typeof time === "number") return Temporal.Instant.fromEpochMilliseconds(time);
    return Temporal.Instant.from(time);
  }
}
