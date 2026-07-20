import type { IPlugin } from "@time-provider/core";
import { Plugin } from "./Plugin.ts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

export const plugin: IPlugin<dayjs.Dayjs> = new Plugin();
