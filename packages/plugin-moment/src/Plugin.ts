import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import moment, { type Moment } from "moment";

export class Plugin implements IPlugin<Moment> {
  createTimeAdapter(): ITimeAdapter<Moment> {
    return new TimeAdapter();
  }
  createManualAdapter(initialTime?: string | number | Moment): IManualTimeAdapter<Moment> {
    return new ManualTimeAdapter(initialTime ? initialTime : moment().utc());
  }
  createFixedAdapter(initialTime: string | number | Moment): ITimeAdapter<Moment> {
    return new FixedTimeAdapter(initialTime);
  }
}
