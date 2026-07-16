import type { IPlugin } from "@time-provider/core";
import { Plugin } from "./Plugin.ts";
import moment from "moment";

export const plugin: IPlugin<moment.Moment> = new Plugin();
