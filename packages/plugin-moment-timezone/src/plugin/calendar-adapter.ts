import { DefaultCalendarAdapter } from "@time-provider/core";
import type {
  CalendarFields,
  ComposableCalendarFields,
  TimezoneDefinition,
} from "@time-provider/core";
import moment from "moment-timezone";

/**
 * The calendar adapter for this plugin, overriding only the two timezone-dependent operations so
 * that cron (and anything else calendar-aware) resolves wall-clock times against
 * **moment-timezone's own bundled tzdata**, exactly like the rest of a moment-timezone app -
 * rather than against the host's ICU, which the shared default uses.
 *
 * The two datasets genuinely disagree: moment-timezone ships a static copy that a consumer pins
 * and updates on their own schedule, while ICU travels with the JS engine, so zones whose rules
 * changed recently (Morocco's Ramadan shifts, the Canadian permanent-DST proposals, ...) can
 * resolve an hour apart between them. `createTimeProvider.for(momentTimezonePlugin)` is a promise
 * that the library behaves the way moment-timezone does, and that has to include which tzdata wins.
 *
 * Everything else is inherited: moment is a Gregorian calendar library, so the unit sizes, month/
 * weekday names and field-carry rules are the default's already. `normalize` in particular must
 * *not* be routed through moment - `moment.utc({ minute: 60 })` yields an invalid moment rather
 * than carrying into the next hour the way the contract requires.
 */
export class MomentTimezoneCalendarAdapter extends DefaultCalendarAdapter<moment.Moment> {
  override decompose(date: moment.Moment, timezone: TimezoneDefinition): CalendarFields {
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
   * `fields` arrives already in range (see {@link ICalendarAdapter.compose}), which is what makes
   * moment's non-carrying object form safe to use here. moment-timezone resolves a DST gap forward
   * past it and a DST overlap to the earlier of the two occurrences - the same resolution the
   * shared default documents, so this override changes *which tzdata* decides, not the rules.
   */
  override compose(fields: ComposableCalendarFields, timezone: TimezoneDefinition): moment.Moment {
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
