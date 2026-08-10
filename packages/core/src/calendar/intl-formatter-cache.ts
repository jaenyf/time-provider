/**
 * Caches `Intl.DateTimeFormat` instances by timezone. Constructing one is expensive enough that
 * any adapter reading wall-clock fields through `Intl` wants to do it once per timezone, not once
 * per call - the cache is static so that sharing spans every adapter instance in the process.
 *
 * Not calendar-specific: `Intl.DateTimeFormat` formats non-Gregorian calendars too (via its own
 * `calendar` option), so this stays out of {@link DefaultCalendarScheme} and is reusable by any
 * future `Intl`-backed adapter.
 */
export class IntlFormatterCache {
  static #formatters = new Map<string, Intl.DateTimeFormat>();

  /**
   * The wall-clock (`year`/`month`/`day`/`hour`/`minute`, `h23`) formatter for `timezone`,
   * created on first use and reused afterwards.
   */
  static wallClockFormatter(timezone: string): Intl.DateTimeFormat {
    let formatter = IntlFormatterCache.#formatters.get(timezone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
      IntlFormatterCache.#formatters.set(timezone, formatter);
    }
    return formatter;
  }
}
