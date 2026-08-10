import type { CalendarSchemeFields, ComposableCalendarSchemeFields } from "../types/types.ts";

/**
 * Operations on {@link CalendarSchemeFields} that hold for any calendar system - they only ever compare
 * or reshape the field bag itself, never interpret what a month/day *means*. Intended for
 * {@link ICalendarScheme} implementors and calendar-consuming code alike.
 */
export class CalendarSchemeFieldsHelper {
  /** Whether `a` and `b` denote the same wall-clock instant, ignoring the derived `weekday`. */
  static equals(a: ComposableCalendarSchemeFields, b: ComposableCalendarSchemeFields): boolean {
    return (
      a.year === b.year &&
      a.month === b.month &&
      a.day === b.day &&
      a.hour === b.hour &&
      a.minute === b.minute
    );
  }

  /**
   * Drops the derived `weekday`, leaving the subset {@link ICalendarScheme.compose} and
   * {@link ICalendarScheme.normalize} accept.
   */
  static toComposable(fields: CalendarSchemeFields): ComposableCalendarSchemeFields {
    const { year, month, day, hour, minute } = fields;
    return { year, month, day, hour, minute };
  }
}
