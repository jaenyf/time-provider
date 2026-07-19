import type { IUtcOnlyManualClock } from "./IUtcOnlyManualClock.ts";
import type { IUtcOnlyClockOnlyProvider } from "./IUtcOnlyClockOnlyProvider.ts";

export interface IUtcOnlyManualClockOnlyProvider<TDate> extends IUtcOnlyClockOnlyProvider<TDate> {
  /**
   * Get the current manual clock
   */
  get clock(): IUtcOnlyManualClock<TDate>;
}
