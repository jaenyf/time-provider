import type { IClock } from "../clock/IClock.ts";
import type { ITimeProvider } from "../api/ITimeProvider.ts";
import type { IParser } from "../parser/IParser.ts";
import type { IScheduler } from "../scheduler/IScheduler.ts";

export interface IRuntime<TDate>
  extends IScheduler, IClock<TDate>, IParser<TDate>, ITimeProvider<TDate> {}
