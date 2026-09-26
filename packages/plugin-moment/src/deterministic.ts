/** Moment.js plugin for Time-Provider's deterministic runtimes.
 * @module */
import type { IUtcOnlyDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";
import type moment from "moment";

/**
 * Moment.js adapter for deterministic (manual/fixed/sequential) Time-Providers.
 * UTC only; use `@time-provider/plugin-moment-timezone` for timezone/local time support.
 * Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: IUtcOnlyDeterministicPlugin<moment.Moment> = new DeterministicPlugin();
