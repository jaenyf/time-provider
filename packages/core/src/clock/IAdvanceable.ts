/**
 * Describe the time elements to manually advance.
 *
 * Note: When more than one element is set, they are applied to the current time in a
 * fixed order :  years, months,days, hours, minutes, seconds, milliseconds.
 * This order is important because, for calendar-variable elements (`months`, `years`), combining them with other
 * elements can give a different result than a different application order would.
 */
export interface IAdvanceOptions {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

/**
 * A clock capable of moving its own time forward or backward.
 */
export interface IAdvanceable<TSelf> {
  /**
   * Moves this clock's time forward (or backward, using negative values) by
   * the given amount.
   *
   * If a scheduler backed by this clock has pending `setTimeout`/
   * `setInterval` callbacks, any of them that become due as a result are run
   * synchronously, in-line, before `advance()` returns - see
   * {@link IScheduler} for details on this execution model.
   */
  advance(advanceOptions: IAdvanceOptions): TSelf;
}
