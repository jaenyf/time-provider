import type { IUtcOnlyClock } from "../clock/IUtcOnlyClock.ts";
import type { IUtcOnlyTimeProvider } from "../api/ITimeProvider.ts";
import type { IScheduler } from "../scheduler/IScheduler.ts";
import type { IUtcOnlyParser } from "../parser/IUtcOnlyParser.ts";

/**
 * A runtime backed by an UTC only clock.
 */
export interface IUtcOnlyRuntime<TDate>
  extends IScheduler, IUtcOnlyClock<TDate>, IUtcOnlyParser<TDate>, IUtcOnlyTimeProvider<TDate> {}
