import { BasePlugin } from "@time-provider/core";
import { SystemRuntime, ManualRuntime, FixedRuntime, SequentialRuntime } from "./Runtimes.ts";
import { DateTime } from "luxon";

export class Plugin extends BasePlugin<DateTime<boolean>> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
