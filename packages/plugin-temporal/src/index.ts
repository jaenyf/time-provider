import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./SystemPlugin.ts";

export const plugin: ISystemPlugin<Temporal.ZonedDateTime> = new SystemPlugin();
