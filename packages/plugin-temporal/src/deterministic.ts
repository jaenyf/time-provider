import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";

export const plugin: IDeterministicPlugin<Temporal.ZonedDateTime> = new DeterministicPlugin();
