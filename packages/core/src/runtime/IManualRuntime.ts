import type { IManualTimeProvider } from "../api/IManualTimeProvider.ts";
import type { IClock } from "../clock/IClock.ts";
import type { IManualClock } from "../clock/IManualClock.ts";
import type { IClockProvider } from "../clock/IClockProvider.ts";
import type { IParser } from "../parser/IParser.ts";
import type { IScheduler } from "../scheduler/IScheduler.ts";

export interface IManualRuntime<TDate>
  extends
    IManualClock<TDate>,
    IClockProvider<IManualClock<TDate>>,
    IScheduler,
    IClock<TDate>,
    IParser<TDate>,
    IManualTimeProvider<TDate> {}
