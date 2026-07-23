import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./DeterministicPlugin.ts";
import { DateTime } from "luxon";

export const plugin: IDeterministicPlugin<DateTime> = new DeterministicPlugin();
