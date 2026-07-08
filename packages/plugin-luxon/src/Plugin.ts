import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { DateTime } from "luxon";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<DateTime> {
  createTimeAdapter(): ITimeAdapter<DateTime> {
    return new TimeAdapter();
  }
  createManualTimeAdapter(initialTime?: string | number | DateTime): IManualTimeAdapter<DateTime> {
    return new ManualTimeAdapter(initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(initialTime: string | number | DateTime): ITimeAdapter<DateTime> {
    return new FixedTimeAdapter(initialTime);
  }
  createSequentialTimeAdapter(
    sequentialTimes: (string | number | DateTime<boolean>)[],
  ): ITimeAdapter<DateTime<boolean>> {
    return new SequentialTimeAdapter(sequentialTimes);
  }
}
