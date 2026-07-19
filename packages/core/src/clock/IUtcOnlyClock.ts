/**
 * A clock that only exposes UTC time.
 */
export interface IUtcOnlyClock<TDate> {
  /**
   * Returns the time as of now in UTC.
   */
  utcNow(): TDate;
}
