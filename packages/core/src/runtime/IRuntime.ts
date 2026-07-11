import type { ITimeProvider } from "../clock/ITimeProvider.ts";
import type { IScheduler } from "../scheduler/IScheduler.ts";

export interface IRuntime<TDate> extends IScheduler, ITimeProvider<TDate> {}
