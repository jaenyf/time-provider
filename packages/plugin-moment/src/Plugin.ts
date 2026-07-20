import { BaseUtcOnlyPlugin } from "@time-provider/core";
import { SystemRuntime, ManualRuntime, FixedRuntime, SequentialRuntime } from "./Runtimes.ts";
import moment from "moment";

export class Plugin extends BaseUtcOnlyPlugin<moment.Moment> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
