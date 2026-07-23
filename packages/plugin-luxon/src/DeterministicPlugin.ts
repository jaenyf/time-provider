import { BaseDeterministicPlugin } from "@time-provider/core/deterministic";
import { FixedRuntime, ManualRuntime, SequentialRuntime } from "./DeterministicRuntimes.ts";
import { DateTime } from "luxon";

export class DeterministicPlugin extends BaseDeterministicPlugin<DateTime> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
