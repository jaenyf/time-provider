/** Caches `Intl.DateTimeFormat` instances by timezone. */
export class IntlFormatterCache {
  static #formatters = new Map<string, Intl.DateTimeFormat>();

  /** Returns the cached wall-clock formatter for `timezone`. */
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
