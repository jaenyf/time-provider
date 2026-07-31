import type { IUtcOnlyDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";
import type moment from "moment";

/**
 * The Moment.js plugin (adapter) for a deterministic (manual/fixed/sequential) Time-Provider.
 * Timezone-naive (UTC only) - use `@time-provider/plugin-moment-timezone` for timezone/local
 * time support. Use with `createTimeProvider.for(plugin)` from `@time-provider/core/deterministic`.
 */
export const plugin: IUtcOnlyDeterministicPlugin<moment.Moment> = new DeterministicPlugin();
