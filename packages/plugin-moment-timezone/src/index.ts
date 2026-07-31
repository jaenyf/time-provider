import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import moment from "moment-timezone";

/**
 * The moment-timezone plugin (adapter) for a system (real time) Time-Provider. Supports
 * timezones and local time. Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: ISystemPlugin<moment.Moment> = new SystemPlugin();
