import type { IManualTimeAdapter, IPlugin, IScheduler, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { DateTime } from "luxon";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<DateTime> {
  createTimeAdapter(scheduler: IScheduler): ITimeAdapter<DateTime> {
    return new TimeAdapter(scheduler);
  }
  createManualTimeAdapter(
    scheduler: IScheduler,
    initialTime?: string | number | DateTime,
  ): IManualTimeAdapter<DateTime> {
    return new ManualTimeAdapter(scheduler, initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(
    scheduler: IScheduler,
    initialTime: string | number | DateTime,
  ): ITimeAdapter<DateTime> {
    return new FixedTimeAdapter(scheduler, initialTime);
  }
  createSequentialTimeAdapter(
    scheduler: IScheduler,
    sequentialTimes: (string | number | DateTime<boolean>)[],
  ): ITimeAdapter<DateTime<boolean>> {
    return new SequentialTimeAdapter(scheduler, sequentialTimes);
  }
}
