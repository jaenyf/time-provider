import type { IUtcOnlyPlugin } from "@time-provider/core";
import { Plugin } from "./Plugin.ts";

export const plugin: IUtcOnlyPlugin<Date> = new Plugin();
