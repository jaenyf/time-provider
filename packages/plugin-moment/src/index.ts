import type { IUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./SystemPlugin.ts";
import moment from "moment";

export const plugin: IUtcOnlySystemPlugin<moment.Moment> = new SystemPlugin();
