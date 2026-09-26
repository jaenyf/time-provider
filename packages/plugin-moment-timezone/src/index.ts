/** Moment.js + moment-timezone plugin for Time-Provider's system runtime.
 * @module */
import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import moment from "moment-timezone";

/**
 * moment-timezone adapter for the system (real time) Time-Provider.
 * Supports timezones and local time. Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: ISystemPlugin<moment.Moment> = new SystemPlugin();
