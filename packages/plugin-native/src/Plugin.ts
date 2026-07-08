import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<Date> {
  createTimeAdapter(): ITimeAdapter<Date> {
    return new TimeAdapter();
  }
  createManualTimeAdapter(initialTime?: string | number | Date): IManualTimeAdapter<Date> {
    return new ManualTimeAdapter(initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(initialTime: string | number | Date): ITimeAdapter<Date> {
    return new FixedTimeAdapter(initialTime);
  }
  createSequentialTimeAdapter(sequentialTimes: (string | number | Date)[]): ITimeAdapter<Date> {
    return new SequentialTimeAdapter(sequentialTimes);
  }
}
