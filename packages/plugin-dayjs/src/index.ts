/** Day.js plugin for Time-Provider's system runtime.
 * @module */
import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

/** Day.js adapter for the system (real time) Time-Provider. Supports timezones and local time. */
export const plugin: ISystemPlugin<dayjs.Dayjs> = new SystemPlugin();
