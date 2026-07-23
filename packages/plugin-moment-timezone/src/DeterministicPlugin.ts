import { BaseDeterministicPlugin } from "@time-provider/core/deterministic";
import { FixedRuntime, ManualRuntime, SequentialRuntime } from "./DeterministicRuntimes.ts";
import moment from "moment-timezone";

export class DeterministicPlugin extends BaseDeterministicPlugin<moment.Moment> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
