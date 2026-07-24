import type { IUtcOnlyDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";

export const plugin: IUtcOnlyDeterministicPlugin<Date> = new DeterministicPlugin();
