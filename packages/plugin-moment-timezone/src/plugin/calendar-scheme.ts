import { DefaultCalendarScheme } from "@time-provider/core";
import type {
  CalendarSchemeFields,
  ComposableCalendarSchemeFields,
  ICalendarScheme,
  TimezoneDefinition,
} from "@time-provider/core";
import moment from "moment-timezone";

/**
 * Calendar scheme using moment-timezone's bundled tzdata for timezone-dependent operations.
 * Other calendar behavior inherits from {@link DefaultCalendarScheme}; normalization remains
 * default-based.
 */
export class MomentTimezoneCalendarScheme
  extends DefaultCalendarScheme<moment.Moment>
  implements ICalendarScheme<moment.Moment>
{
  override decompose(date: moment.Moment, timezone: TimezoneDefinition): CalendarSchemeFields {
    const zoned = moment.tz(date.valueOf(), timezone);
    return {
      year: zoned.year(),
      month: zoned.month() + 1,
      day: zoned.date(),
      hour: zoned.hour(),
      minute: zoned.minute(),
      weekday: zoned.day(),
    };
  }

  /**
   * Composes already-normalized fields with moment-timezone's tzdata.
   * DST gaps resolve forward and overlaps to the earlier occurrence, matching the shared default.
   * @see {@link ICalendarScheme.compose}
   */
  override compose(
    fields: ComposableCalendarSchemeFields,
    timezone: TimezoneDefinition,
  ): moment.Moment {
    return moment.tz(
      {
        year: fields.year,
        month: fields.month - 1,
        day: fields.day,
        hour: fields.hour,
        minute: fields.minute,
      },
      timezone,
    );
  }
}
