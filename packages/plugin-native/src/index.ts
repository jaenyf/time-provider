import type { IUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";

export const plugin: IUtcOnlySystemPlugin<Date> = new SystemPlugin();
