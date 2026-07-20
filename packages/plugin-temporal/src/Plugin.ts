import { BasePlugin } from "@time-provider/core";
import { SystemRuntime, ManualRuntime, FixedRuntime, SequentialRuntime } from "./Runtimes.ts";
import { Temporal } from "@js-temporal/polyfill";

export class Plugin extends BasePlugin<Temporal.ZonedDateTime> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
