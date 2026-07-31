import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";

/**
 * The Temporal (`Temporal.ZonedDateTime`) plugin (adapter) for a system (real time)
 * Time-Provider. Supports timezones and local time. Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: ISystemPlugin<Temporal.ZonedDateTime> = new SystemPlugin();
