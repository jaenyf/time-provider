import { BaseUtcOnlyDeterministicPlugin } from "@time-provider/core/deterministic";
import { FixedRuntime, ManualRuntime, SequentialRuntime } from "./DeterministicRuntimes.ts";
import moment from "moment";

export class DeterministicPlugin extends BaseUtcOnlyDeterministicPlugin<moment.Moment> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
