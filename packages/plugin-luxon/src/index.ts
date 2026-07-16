import type { IPlugin } from "@time-provider/core";
import { Plugin } from "./Plugin.ts";
import { DateTime } from "luxon";

export const plugin: IPlugin<DateTime> = new Plugin();
