import { type IManualRuntime, type IPlugin, type IRuntime } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import { ManualRuntime } from "./ManualRuntime.ts";
import { SequentialRuntime } from "./SequentialRuntime.ts";
import { FixedRuntime } from "./FixedRuntime.ts";

export class Plugin implements IPlugin<Date> {
  createSystemRuntime(): IRuntime<Date> {
    return new SystemRuntime();
  }
  createManualRuntime(initialTime?: string | number | Date): IManualRuntime<Date> {
    return new ManualRuntime(initialTime ? initialTime : 0);
  }
  createFixedRuntime(initialTime: string | number | Date): IRuntime<Date> {
    return new FixedRuntime(initialTime);
  }
  createSequentialRuntime(sequentialTimes: (string | number | Date)[]): IRuntime<Date> {
    return new SequentialRuntime(sequentialTimes);
  }
}
