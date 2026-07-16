import type { IPlugin } from "@time-provider/core";
import { Plugin } from "./Plugin.ts";

export const plugin: IPlugin<Date> = new Plugin();
