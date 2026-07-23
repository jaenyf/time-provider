import { BaseDeterministicPlugin } from "@time-provider/core/deterministic";
import { FixedRuntime, ManualRuntime, SequentialRuntime } from "./DeterministicRuntimes.ts";
import dayjs from "dayjs";

export class DeterministicPlugin extends BaseDeterministicPlugin<dayjs.Dayjs> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}
