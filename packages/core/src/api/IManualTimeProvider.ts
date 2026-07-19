import type { IParserOnlyProvider } from "../parser/IParserOnlyProvider.ts";
import type { ISchedulerOnlyProvider } from "../scheduler/ISchedulerOnlyProvider.ts";
import type { IManualClockOnlyProvider } from "../clock/IManualClockOnlyProvider.ts";
import type { IUtcOnlyManualClockOnlyProvider } from "../clock/IUtcOnlyManualClockOnlyProvider.ts";

export interface IManualTimeProvider<TDate>
  extends IManualClockOnlyProvider<TDate>, ISchedulerOnlyProvider, IParserOnlyProvider<TDate> {}

export interface IUtcOnlyManualTimeProvider<TDate>
  extends
    IUtcOnlyManualClockOnlyProvider<TDate>,
    ISchedulerOnlyProvider,
    IParserOnlyProvider<TDate> {}
