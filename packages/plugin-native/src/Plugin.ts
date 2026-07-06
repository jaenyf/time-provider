import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";

export class Plugin implements IPlugin<Date> {
  createTimeAdapter(): ITimeAdapter<Date> {
    return new TimeAdapter();
  }
  createManualAdapter(initialTime?: string | number | Date): IManualTimeAdapter<Date> {
    return new ManualTimeAdapter(initialTime ? initialTime : new Date());
  }
  createFixedAdapter(initialTime: string | number | Date): ITimeAdapter<Date> {
    return new FixedTimeAdapter(initialTime);
  }
}
