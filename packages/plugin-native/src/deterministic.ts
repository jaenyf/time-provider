import type { IUtcOnlyDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";

/**
 * The native `Date` plugin (adapter) for a deterministic (manual/fixed/sequential)
 * Time-Provider. Timezone-naive (UTC only) - has no external date library dependency. Use with
 * `createTimeProvider.for(plugin)` from `@time-provider/core/deterministic`.
 */
export const plugin: IUtcOnlyDeterministicPlugin<Date> = new DeterministicPlugin();
