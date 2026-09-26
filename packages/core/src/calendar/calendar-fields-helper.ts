import type { CalendarSchemeFields, ComposableCalendarSchemeFields } from "../types/types.ts";

/** Calendar-agnostic operations on calendar fields. */
export class CalendarSchemeFieldsHelper {
  /** Whether `a` and `b` denote the same wall-clock instant. */
  static equals(a: ComposableCalendarSchemeFields, b: ComposableCalendarSchemeFields): boolean {
    return (
      a.year === b.year &&
      a.month === b.month &&
      a.day === b.day &&
      a.hour === b.hour &&
      a.minute === b.minute
    );
  }

  /** Drops the derived `weekday`. */
  static toComposable(fields: CalendarSchemeFields): ComposableCalendarSchemeFields {
    const { year, month, day, hour, minute } = fields;
    return { year, month, day, hour, minute };
  }
}
