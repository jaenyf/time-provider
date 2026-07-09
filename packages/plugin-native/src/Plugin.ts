import type { IManualTimeAdapter, IPlugin, IScheduler, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<Date> {
  createTimeAdapter(scheduler: IScheduler): ITimeAdapter<Date> {
    return new TimeAdapter(scheduler);
  }
  createManualTimeAdapter(
    scheduler: IScheduler,
    initialTime?: string | number | Date,
  ): IManualTimeAdapter<Date> {
    return new ManualTimeAdapter(scheduler, initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(
    scheduler: IScheduler,
    initialTime: string | number | Date,
  ): ITimeAdapter<Date> {
    return new FixedTimeAdapter(scheduler, initialTime);
  }
  createSequentialTimeAdapter(
    scheduler: IScheduler,
    sequentialTimes: (string | number | Date)[],
  ): ITimeAdapter<Date> {
    return new SequentialTimeAdapter(scheduler, sequentialTimes);
  }
}
