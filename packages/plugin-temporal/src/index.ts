import type { IPlugin } from "@time-provider/core";
import { Plugin } from "./Plugin.ts";
import type { Temporal } from "@js-temporal/polyfill";

export const plugin: IPlugin<Temporal.Instant> = new Plugin();
