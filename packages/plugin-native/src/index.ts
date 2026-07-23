import type { IUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./SystemPlugin.ts";

export const plugin: IUtcOnlySystemPlugin<Date> = new SystemPlugin();
