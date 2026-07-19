import type { IAdvanceableClockConfiguration } from "./IAdvanceableClockConfiguration.ts";
import type { IUtcOnlyClock } from "./IUtcOnlyClock.ts";

export interface IUtcOnlyManualClock<TDate> extends IUtcOnlyClock<TDate> {
  /**
   * Moves this clock's time forward (or backward, using negative values) by
   * the given amount.
   *
   * If a scheduler backed by this clock has pending `setTimeout`/
   * `setInterval` callbacks, any of them that become due as a result are run
   * synchronously, in-line, before `advance()` returns - see
   * {@link IScheduler} for details on this execution model.
   */

  advance(advanceConfiguration: IAdvanceableClockConfiguration): IUtcOnlyManualClock<TDate>;
}
