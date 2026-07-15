import type { IClock } from "./IClock.ts";

export interface IClockOnlyProvider<TDate> {
  /**
   * Get the current configured clock
   */
  get clock(): IClock<TDate>;
}
