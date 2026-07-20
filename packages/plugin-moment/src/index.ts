import type { IUtcOnlyPlugin } from "@time-provider/core";
import { Plugin } from "./Plugin.ts";
import moment from "moment";

export const plugin: IUtcOnlyPlugin<moment.Moment> = new Plugin();
