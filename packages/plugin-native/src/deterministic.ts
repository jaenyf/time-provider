/** Native `Date` plugin for deterministic Time-Provider runtimes.
 * @module */
import type { IUtcOnlyDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";

/**
 * Native `Date` adapter for deterministic (manual/fixed/sequential) Time-Providers.
 * UTC only; no external date library dependency. Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: IUtcOnlyDeterministicPlugin<Date> = new DeterministicPlugin();
