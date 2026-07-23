import { BaseDeterministicPlugin } from "@time-provider/core/deterministic";
import { FixedRuntime, ManualRuntime, SequentialRuntime } from "./DeterministicRuntimes.ts";

export class DeterministicPlugin extends BaseDeterministicPlugin<Temporal.ZonedDateTime> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
