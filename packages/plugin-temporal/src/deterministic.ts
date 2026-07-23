import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./DeterministicPlugin.ts";

export const plugin: IDeterministicPlugin<Temporal.ZonedDateTime> = new DeterministicPlugin();
