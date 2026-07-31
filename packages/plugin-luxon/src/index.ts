import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import { DateTime } from "luxon";

/**
 * The Luxon plugin (adapter) for a system (real time) Time-Provider. Supports timezones and
 * local time. Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: ISystemPlugin<DateTime> = new SystemPlugin();
