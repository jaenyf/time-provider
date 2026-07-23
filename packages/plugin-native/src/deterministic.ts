import type { IUtcOnlyDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./DeterministicPlugin.ts";

export const plugin: IUtcOnlyDeterministicPlugin<Date> = new DeterministicPlugin();
