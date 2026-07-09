import type { IManualTimeAdapter, IPlugin, IScheduler, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import moment, { type Moment } from "moment";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<Moment> {
  createTimeAdapter(scheduler: IScheduler): ITimeAdapter<Moment> {
    return new TimeAdapter(scheduler);
  }
  createManualTimeAdapter(
    scheduler: IScheduler,
    initialTime?: string | number | Moment,
  ): IManualTimeAdapter<Moment> {
    return new ManualTimeAdapter(scheduler, initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(
    scheduler: IScheduler,
    initialTime: string | number | Moment,
  ): ITimeAdapter<Moment> {
    return new FixedTimeAdapter(scheduler, initialTime);
  }
  createSequentialTimeAdapter(
    scheduler: IScheduler,
    sequentialTimes: (string | number | moment.Moment)[],
  ): ITimeAdapter<moment.Moment> {
    return new SequentialTimeAdapter(scheduler, sequentialTimes);
  }
}
