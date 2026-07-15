import type { IParserOnlyProvider } from "../parser/IParserOnlyProvider.ts";
import type { ISchedulerOnlyProvider } from "../scheduler/ISchedulerOnlyProvider.ts";
import type { IManualClockOnlyProvider } from "../clock/IManualClockOnlyProvider.ts";

export interface IManualTimeProvider<TDate>
  extends IManualClockOnlyProvider<TDate>, ISchedulerOnlyProvider, IParserOnlyProvider<TDate> {}
