import { type IManualRuntime, type IPlugin, type IRuntime } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import { ManualRuntime } from "./ManualRuntime.ts";
import { SequentialRuntime } from "./SequentialRuntime.ts";
import { FixedRuntime } from "./FixedRuntime.ts";
import { Temporal } from "@js-temporal/polyfill";

export class Plugin implements IPlugin<Temporal.Instant> {
  createSystemRuntime(): IRuntime<Temporal.Instant> {
    return new SystemRuntime();
  }
  createManualRuntime(
    initialTime?: string | number | Temporal.Instant,
  ): IManualRuntime<Temporal.Instant> {
    return new ManualRuntime(initialTime ? initialTime : 0);
  }
  createFixedRuntime(initialTime: string | number | Temporal.Instant): IRuntime<Temporal.Instant> {
    return new FixedRuntime(initialTime);
  }
  createSequentialRuntime(
    sequentialTimes: (string | number | Temporal.Instant)[],
  ): IRuntime<Temporal.Instant> {
    return new SequentialRuntime(sequentialTimes);
  }
}
