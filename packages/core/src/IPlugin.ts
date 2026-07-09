import type { IManualTimeAdapter } from "./clock/IManualTimeAdapter.ts";
import type { ITimeAdapter } from "./clock/ITimeAdapter.ts";
import type { IScheduler } from "./scheduler/IScheduler.ts";

export interface IPlugin<TDate> {
  createTimeAdapter(scheduler: IScheduler): ITimeAdapter<TDate>;
  createManualTimeAdapter(
    scheduler: IScheduler,
    initialTime: string | number | TDate,
  ): IManualTimeAdapter<TDate>;
  createFixedTimeAdapter(
    scheduler: IScheduler,
    initialTime: string | number | TDate,
  ): ITimeAdapter<TDate>;
  createSequentialTimeAdapter(
    scheduler: IScheduler,
    sequentialTimes: (string | number | TDate)[],
  ): ITimeAdapter<TDate>;
}
