import type { IUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";
import moment from "moment";

/**
 * The Moment.js plugin (adapter) for a system (real time) Time-Provider. Timezone-naive
 * (UTC only) - use `@time-provider/plugin-moment-timezone` for timezone/local time support.
 * Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: IUtcOnlySystemPlugin<moment.Moment> = new SystemPlugin();
