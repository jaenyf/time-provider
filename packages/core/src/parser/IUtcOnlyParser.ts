/**
 * A parser that only exposes parsing to UTC.
 */
export interface IUtcOnlyParser<TDate> {
  /**
   * Parses `time` into a UTC time `TDate` instance.
   *
   * Accepts an ISO 8601 time string, an epoch-milliseconds number, or an already-parsed `TDate`.
   * Other string formats (e.g. RFC 2822, or a date library's own non-ISO `toString()`
   * output) are not supported and may throw or produce an unspecified
   * result depending on the underlying date library.
   * @returns a TDate expressed as UTC time.
   */
  parseToUtc(time: string | number | TDate): TDate;
}
