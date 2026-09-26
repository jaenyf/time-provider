/** Luxon plugin for Time-Provider's system runtime.
 * @module */
import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import { DateTime } from "luxon";

/** Luxon adapter for the system (real time) Time-Provider. Supports timezones and local time. */
export const plugin: ISystemPlugin<DateTime> = new SystemPlugin();
