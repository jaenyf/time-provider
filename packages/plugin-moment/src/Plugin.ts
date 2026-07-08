import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import moment, { type Moment } from "moment";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<Moment> {
  createTimeAdapter(): ITimeAdapter<Moment> {
    return new TimeAdapter();
  }
  createManualTimeAdapter(initialTime?: string | number | Moment): IManualTimeAdapter<Moment> {
    return new ManualTimeAdapter(initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(initialTime: string | number | Moment): ITimeAdapter<Moment> {
    return new FixedTimeAdapter(initialTime);
  }
  createSequentialTimeAdapter(
    sequentialTimes: (string | number | moment.Moment)[],
  ): ITimeAdapter<moment.Moment> {
    return new SequentialTimeAdapter(sequentialTimes);
  }
}
