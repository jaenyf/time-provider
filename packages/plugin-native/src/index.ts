import type { IUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";

/**
 * The native `Date` plugin (adapter) for a system (real time) Time-Provider. Timezone-naive
 * (UTC only) - has no external date library dependency. Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: IUtcOnlySystemPlugin<Date> = new SystemPlugin();
