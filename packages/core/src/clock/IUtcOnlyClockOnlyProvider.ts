import type { IUtcOnlyClock } from "./IUtcOnlyClock.ts";

export interface IUtcOnlyClockOnlyProvider<TDate> {
  /**
   * Get the current configured clock
   */
  get clock(): IUtcOnlyClock<TDate>;
}
