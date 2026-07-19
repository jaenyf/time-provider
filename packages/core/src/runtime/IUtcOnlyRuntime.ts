import type { IUtcOnlyClock } from "../clock/IUtcOnlyClock.ts";
import type { IUtcOnlyTimeProvider } from "../api/ITimeProvider.ts";
import type { IParser } from "../parser/IParser.ts";
import type { IScheduler } from "../scheduler/IScheduler.ts";

export interface IUtcOnlyRuntime<TDate>
  extends IScheduler, IUtcOnlyClock<TDate>, IParser<TDate>, IUtcOnlyTimeProvider<TDate> {}
