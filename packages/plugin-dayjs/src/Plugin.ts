import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import dayjs, { Dayjs } from "dayjs";

export class Plugin implements IPlugin<Dayjs> {
  createTimeAdapter(): ITimeAdapter<Dayjs> {
    return new TimeAdapter();
  }
  createManualAdapter(initialTime?: string | number | Dayjs): IManualTimeAdapter<Dayjs> {
    return new ManualTimeAdapter(initialTime ? initialTime : dayjs().utc());
  }
  createFixedAdapter(initialTime: string | number | Dayjs): ITimeAdapter<Dayjs> {
    return new FixedTimeAdapter(initialTime);
  }
}
