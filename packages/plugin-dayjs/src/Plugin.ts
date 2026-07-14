import { type IManualRuntime, type IPlugin, type IRuntime } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import { ManualRuntime } from "./ManualRuntime.ts";
import { SequentialRuntime } from "./SequentialRuntime.ts";
import { FixedRuntime } from "./FixedRuntime.ts";
import dayjs, { Dayjs } from "dayjs";

export class Plugin implements IPlugin<Dayjs> {
  createSystemRuntime(): IRuntime<Dayjs> {
    return new SystemRuntime();
  }
  createManualRuntime(initialTime?: string | number | Dayjs): IManualRuntime<Dayjs> {
    return new ManualRuntime(initialTime ? initialTime : 0);
  }
  createFixedRuntime(initialTime: string | number | Dayjs): IRuntime<Dayjs> {
    return new FixedRuntime(initialTime);
  }
  createSequentialRuntime(
    sequentialTimes: (string | number | dayjs.Dayjs)[],
  ): IRuntime<dayjs.Dayjs> {
    return new SequentialRuntime(sequentialTimes);
  }
}
