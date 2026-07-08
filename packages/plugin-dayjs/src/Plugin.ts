import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import dayjs, { Dayjs } from "dayjs";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<Dayjs> {
  createTimeAdapter(): ITimeAdapter<Dayjs> {
    return new TimeAdapter();
  }
  createManualTimeAdapter(initialTime?: string | number | Dayjs): IManualTimeAdapter<Dayjs> {
    return new ManualTimeAdapter(initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(initialTime: string | number | Dayjs): ITimeAdapter<Dayjs> {
    return new FixedTimeAdapter(initialTime);
  }
  createSequentialTimeAdapter(
    sequentialTimes: (string | number | dayjs.Dayjs)[],
  ): ITimeAdapter<dayjs.Dayjs> {
    return new SequentialTimeAdapter(sequentialTimes);
  }
}
