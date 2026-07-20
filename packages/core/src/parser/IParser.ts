export interface IParser<TDate> {
  /**
   * Parses `time` into a `TDate` instance.
   *
   * Accepts an ISO 8601 time string, an epoch-milliseconds number, or an already-parsed `TDate`.
   * Other string formats (e.g. RFC 2822, or a date library's own non-ISO `toString()`
   * output) are not supported and may throw or produce an unspecified
   * result depending on the underlying date library.
   * @param expressesAsLocal whether or not to express time as local time instead of UTC.
   * @returns a TDate expressed as UTC.
   */
  parse(time: string | number | TDate, expressesAsLocal?: boolean): TDate;
}
