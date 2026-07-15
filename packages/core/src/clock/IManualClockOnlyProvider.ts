import type { IClockOnlyProvider } from "./IClockOnlyProvider.ts";
import type { IManualClock } from "./IManualClock.ts";

export interface IManualClockOnlyProvider<TDate> extends IClockOnlyProvider<TDate> {
  /**
   * Get the current manual clock
   */
  get clock(): IManualClock<TDate>;
}
