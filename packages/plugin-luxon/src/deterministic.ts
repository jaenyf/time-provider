import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";
import { DateTime } from "luxon";

export const plugin: IDeterministicPlugin<DateTime> = new DeterministicPlugin();
