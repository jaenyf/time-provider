import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";

/**
 * The Temporal (`Temporal.ZonedDateTime`) plugin (adapter) for a deterministic
 * (manual/fixed/sequential) Time-Provider. Supports timezones and local time. Use with
 * `createTimeProvider.for(plugin)` from `@time-provider/core/deterministic`.
 */
export const plugin: IDeterministicPlugin<Temporal.ZonedDateTime> = new DeterministicPlugin();
