import type { IUtcOnlyManualTimeProvider } from "../api/IManualTimeProvider.ts";
import type { IUtcOnlyClock } from "../clock/IUtcOnlyClock.ts";
import type { IUtcOnlyManualClock } from "../clock/IUtcOnlyManualClock.ts";
import type { IClockProvider } from "../clock/IClockProvider.ts";
import type { IUtcOnlyParser } from "../parser/IUtcOnlyParser.ts";
import type { IScheduler } from "../scheduler/IScheduler.ts";

/**
 * A runtime backed by an UTC only manual clock.
 */
export interface IUtcOnlyManualRuntime<TDate>
  extends
    IUtcOnlyManualClock<TDate>,
    IClockProvider<IUtcOnlyManualClock<TDate>>,
    IScheduler,
    IUtcOnlyClock<TDate>,
    IUtcOnlyParser<TDate>,
    IUtcOnlyManualTimeProvider<TDate> {}
