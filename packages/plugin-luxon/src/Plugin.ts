import { type IManualRuntime, type IPlugin, type IRuntime } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import { ManualRuntime } from "./ManualRuntime.ts";
import { SequentialRuntime } from "./SequentialRuntime.ts";
import { FixedRuntime } from "./FixedRuntime.ts";
import { DateTime } from "luxon";

export class Plugin implements IPlugin<DateTime<boolean>> {
  createSystemRuntime(): IRuntime<DateTime<boolean>> {
    return new SystemRuntime();
  }
  createManualRuntime(
    initialTime?: string | number | DateTime<boolean>,
  ): IManualRuntime<DateTime<boolean>> {
    return new ManualRuntime(initialTime ? initialTime : 0);
  }
  createFixedRuntime(
    initialTime: string | number | DateTime<boolean>,
  ): IRuntime<DateTime<boolean>> {
    return new FixedRuntime(initialTime);
  }
  createSequentialRuntime(
    sequentialTimes: (string | number | DateTime<boolean>)[],
  ): IRuntime<DateTime<boolean>> {
    return new SequentialRuntime(sequentialTimes);
  }
}
