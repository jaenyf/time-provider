import { BaseUtcOnlyPlugin } from "@time-provider/core";
import { SystemRuntime, ManualRuntime, FixedRuntime, SequentialRuntime } from "./Runtimes.ts";

export class Plugin extends BaseUtcOnlyPlugin<Date> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
