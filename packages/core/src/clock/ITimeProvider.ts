import type { ISchedulerOnlyProvider } from "../scheduler/ISchedulerOnlyProvider.ts";
import type { ITimeOnlyProvider } from "./ITimeOnlyProvider.ts";

export interface ITimeProvider<TDate> extends ITimeOnlyProvider<TDate>, ISchedulerOnlyProvider {}
