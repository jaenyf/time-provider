import type { ISystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./SystemPlugin.ts";
import moment from "moment-timezone";

export const plugin: ISystemPlugin<moment.Moment> = new SystemPlugin();
