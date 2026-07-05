import type { IManualTimeAdapter, IPlugin, ITimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { ManualTimeAdapter } from "./ManualTimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { Temporal } from "@js-temporal/polyfill";

export class Plugin implements IPlugin<Temporal.Instant> {
  createTimeAdapter(): ITimeAdapter<Temporal.Instant> {
    return new TimeAdapter();
  }
  createManualAdapter(
    initialTime?: string | number | Temporal.Instant,
  ): IManualTimeAdapter<Temporal.Instant> {
    return new ManualTimeAdapter(
      initialTime ? initialTime : Temporal.Now.zonedDateTimeISO("UTC").toInstant(),
    );
  }
  createFixedAdapter(
    initialTime: string | number | Temporal.Instant,
  ): ITimeAdapter<Temporal.Instant> {
    return new FixedTimeAdapter(initialTime);
  }
}
