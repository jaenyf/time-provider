import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { Temporal } from "@js-temporal/polyfill";
import { SequentialTimeAdapter } from "./SequentialTimeAdapter.ts";

export class Plugin implements IPlugin<Temporal.Instant> {
  createTimeAdapter(): ITimeAdapter<Temporal.Instant> {
    return new TimeAdapter();
  }
  createManualTimeAdapter(
    initialTime?: string | number | Temporal.Instant,
  ): IManualTimeAdapter<Temporal.Instant> {
    return new ManualTimeAdapter(initialTime ? initialTime : 0);
  }
  createFixedTimeAdapter(
    initialTime: string | number | Temporal.Instant,
  ): ITimeAdapter<Temporal.Instant> {
    return new FixedTimeAdapter(initialTime);
  }
  createSequentialTimeAdapter(
    sequentialTimes: (string | number | Temporal.Instant)[],
  ): ITimeAdapter<Temporal.Instant> {
    return new SequentialTimeAdapter(sequentialTimes);
  }
}
