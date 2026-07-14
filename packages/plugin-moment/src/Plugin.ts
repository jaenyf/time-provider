import { type IManualRuntime, type IPlugin, type IRuntime } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import { ManualRuntime } from "./ManualRuntime.ts";
import { SequentialRuntime } from "./SequentialRuntime.ts";
import { FixedRuntime } from "./FixedRuntime.ts";
import moment from "moment";

export class Plugin implements IPlugin<moment.Moment> {
  createSystemRuntime(): IRuntime<moment.Moment> {
    return new SystemRuntime();
  }
  createManualRuntime(
    initialTime?: string | number | moment.Moment,
  ): IManualRuntime<moment.Moment> {
    return new ManualRuntime(initialTime ? initialTime : 0);
  }
  createFixedRuntime(initialTime: string | number | moment.Moment): IRuntime<moment.Moment> {
    return new FixedRuntime(initialTime);
  }
  createSequentialRuntime(
    sequentialTimes: (string | number | moment.Moment)[],
  ): IRuntime<moment.Moment> {
    return new SequentialRuntime(sequentialTimes);
  }
}
