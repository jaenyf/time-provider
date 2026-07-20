import { BasePlugin } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import { ManualRuntime } from "./ManualRuntime.ts";
import { SequentialRuntime } from "./SequentialRuntime.ts";
import { FixedRuntime } from "./FixedRuntime.ts";
import { Temporal } from "@js-temporal/polyfill";

export class Plugin extends BasePlugin<Temporal.ZonedDateTime> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
