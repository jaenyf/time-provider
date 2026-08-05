import type { CalendarFields, ComposableCalendarFields } from "../types/types.ts";

/**
 * Operations on {@link CalendarFields} that hold for any calendar system - they only ever compare
 * or reshape the field bag itself, never interpret what a month/day *means*. Intended for
 * {@link ICalendarAdapter} implementors and calendar-consuming code alike.
 */
export class CalendarFieldsHelper {
  /** Whether `a` and `b` denote the same wall-clock instant, ignoring the derived `weekday`. */
  static equals(a: ComposableCalendarFields, b: ComposableCalendarFields): boolean {
    return (
      a.year === b.year &&
      a.month === b.month &&
      a.day === b.day &&
      a.hour === b.hour &&
      a.minute === b.minute
    );
  }

  /**
   * Drops the derived `weekday`, leaving the subset {@link ICalendarAdapter.compose} and
   * {@link ICalendarAdapter.normalize} accept.
   */
  static toComposable(fields: CalendarFields): ComposableCalendarFields {
    const { year, month, day, hour, minute } = fields;
    return { year, month, day, hour, minute };
  }
}
