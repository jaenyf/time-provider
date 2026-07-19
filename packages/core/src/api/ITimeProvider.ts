import type { IParserOnlyProvider } from "../parser/IParserOnlyProvider.ts";
import type { ISchedulerOnlyProvider } from "../scheduler/ISchedulerOnlyProvider.ts";
import type { IClockOnlyProvider } from "../clock/IClockOnlyProvider.ts";
import type { IUtcOnlyClockOnlyProvider } from "../clock/IUtcOnlyClockOnlyProvider.ts";

export interface ITimeProvider<TDate>
  extends IClockOnlyProvider<TDate>, ISchedulerOnlyProvider, IParserOnlyProvider<TDate> {}

export interface IUtcOnlyTimeProvider<TDate>
  extends IUtcOnlyClockOnlyProvider<TDate>, ISchedulerOnlyProvider, IParserOnlyProvider<TDate> {}
