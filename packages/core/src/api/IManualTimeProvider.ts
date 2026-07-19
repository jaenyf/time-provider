import type { IParserOnlyProvider } from "../parser/IParserOnlyProvider.ts";
import type { ISchedulerOnlyProvider } from "../scheduler/ISchedulerOnlyProvider.ts";
import type { IManualClockOnlyProvider } from "../clock/IManualClockOnlyProvider.ts";
import type { IUtcOnlyClockOnlyProvider } from "../clock/IUtcOnlyClockOnlyProvider.ts";

export interface IManualTimeProvider<TDate>
  extends IManualClockOnlyProvider<TDate>, ISchedulerOnlyProvider, IParserOnlyProvider<TDate> {}

export interface IUtcOnlyManualTimeProvider<TDate>
  extends IUtcOnlyClockOnlyProvider<TDate>, ISchedulerOnlyProvider, IParserOnlyProvider<TDate> {}
