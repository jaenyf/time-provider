import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { DateTime } from "luxon";

export class Plugin implements IPlugin<DateTime> {
  createTimeAdapter(): ITimeAdapter<DateTime> {
    return new TimeAdapter();
  }
  createManualAdapter(initialTime?: string | number | DateTime): IManualTimeAdapter<DateTime> {
    return new ManualTimeAdapter(initialTime ? initialTime : DateTime.utc());
  }
  createFixedAdapter(initialTime: string | number | DateTime): ITimeAdapter<DateTime> {
    return new FixedTimeAdapter(initialTime);
  }
}
