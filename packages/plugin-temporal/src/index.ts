import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";

export const plugin: ISystemPlugin<Temporal.ZonedDateTime> = new SystemPlugin();
