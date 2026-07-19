import type { IUtcOnlyManualTimeProvider } from "../api/IManualTimeProvider.ts";
import type { IUtcOnlyClock } from "../clock/IUtcOnlyClock.ts";
import type { IUtcOnlyManualClock } from "../clock/IUtcOnlyManualClock.ts";
import type { IUtcOnlyManualClockOnlyProvider } from "../clock/IUtcOnlyManualClockOnlyProvider.ts";
import type { IParser } from "../parser/IParser.ts";
import type { IScheduler } from "../scheduler/IScheduler.ts";

export interface IUtcOnlyManualRuntime<TDate>
  extends
    IUtcOnlyManualClock<TDate>,
    IUtcOnlyManualClockOnlyProvider<TDate>,
    IScheduler,
    IUtcOnlyClock<TDate>,
    IParser<TDate>,
    IUtcOnlyManualTimeProvider<TDate> {}
