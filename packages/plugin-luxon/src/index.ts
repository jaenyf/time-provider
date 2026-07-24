import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import { DateTime } from "luxon";

export const plugin: ISystemPlugin<DateTime> = new SystemPlugin();
