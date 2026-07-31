import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * The Day.js plugin (adapter) for a system (real time) Time-Provider. Supports timezones and
 * local time. Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: ISystemPlugin<dayjs.Dayjs> = new SystemPlugin();
