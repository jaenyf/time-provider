import type { IManualTimeAdapter, IPlugin, IScheduler, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import dayjs, { Dayjs } from "dayjs";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<Dayjs> {
  createTimeAdapter(scheduler: IScheduler): ITimeAdapter<Dayjs> {
    return new TimeAdapter(scheduler);
  }
  createManualTimeAdapter(
    scheduler: IScheduler,
    initialTime?: string | number | Dayjs,
  ): IManualTimeAdapter<Dayjs> {
    return new ManualTimeAdapter(scheduler, initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(
    scheduler: IScheduler,
    initialTime: string | number | Dayjs,
  ): ITimeAdapter<Dayjs> {
    return new FixedTimeAdapter(scheduler, initialTime);
  }
  createSequentialTimeAdapter(
    scheduler: IScheduler,
    sequentialTimes: (string | number | dayjs.Dayjs)[],
  ): ITimeAdapter<dayjs.Dayjs> {
    return new SequentialTimeAdapter(scheduler, sequentialTimes);
  }
}
