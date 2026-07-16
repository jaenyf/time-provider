import type { IPlugin } from "@time-provider/core";
import { Plugin } from "./Plugin.ts";
import type dayjs from "dayjs";

export const plugin: IPlugin<dayjs.Dayjs> = new Plugin();
