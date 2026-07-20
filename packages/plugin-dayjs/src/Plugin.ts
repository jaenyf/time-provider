import { BasePlugin } from "@time-provider/core";
import { SystemRuntime, ManualRuntime, FixedRuntime, SequentialRuntime } from "./Runtimes.ts";
import { Dayjs } from "dayjs";

export class Plugin extends BasePlugin<Dayjs> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
