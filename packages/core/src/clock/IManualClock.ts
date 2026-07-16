import type { IClock } from "./IClock.ts";

export interface IAdvanceConfiguration {
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  years?: number;
  months?: number;
  days?: number;
}

export interface IManualClock<TDate> extends IClock<TDate> {
  /**
   * Moves this clock's time forward (or backward, using negative values) by
   * the given amount.
   *
   * If a scheduler backed by this clock has pending `setTimeout`/
   * `setInterval` callbacks, any of them that become due as a result are run
   * synchronously, in-line, before `advance()` returns - see
   * {@link IScheduler} for details on this execution model.
   */

  advance(advanceConfiguration: IAdvanceConfiguration): IManualClock<TDate>;
}
