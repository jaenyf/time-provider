import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./SystemPlugin.ts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

export const plugin: ISystemPlugin<dayjs.Dayjs> = new SystemPlugin();
