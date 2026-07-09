import type { IManualTimeAdapter, IPlugin, IScheduler, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { Temporal } from "@js-temporal/polyfill";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<Temporal.Instant> {
  createTimeAdapter(scheduler: IScheduler): ITimeAdapter<Temporal.Instant> {
    return new TimeAdapter(scheduler);
  }
  createManualTimeAdapter(
    scheduler: IScheduler,
    initialTime?: string | number | Temporal.Instant,
  ): IManualTimeAdapter<Temporal.Instant> {
    return new ManualTimeAdapter(scheduler, initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(
    scheduler: IScheduler,
    initialTime: string | number | Temporal.Instant,
  ): ITimeAdapter<Temporal.Instant> {
    return new FixedTimeAdapter(scheduler, initialTime);
  }
  createSequentialTimeAdapter(
    scheduler: IScheduler,
    sequentialTimes: (string | number | Temporal.Instant)[],
  ): ITimeAdapter<Temporal.Instant> {
    return new SequentialTimeAdapter(scheduler, sequentialTimes);
  }
}
