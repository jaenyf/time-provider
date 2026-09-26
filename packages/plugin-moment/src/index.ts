/** Moment.js plugin for Time-Provider's system runtime.
 * @module */
import type { IUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import moment from "moment";

/** Moment.js adapter for the system (real time) Time-Provider. UTC only; use
 * `@time-provider/plugin-moment-timezone` for timezone/local time support.
 * Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: IUtcOnlySystemPlugin<moment.Moment> = new SystemPlugin();
