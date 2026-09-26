/**
 * The Moment.js + moment-timezone plugin for Time-Provider's deterministic runtimes.
 *
 * @module
 */
import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";
import moment from "moment-timezone";

/**
 * The moment-timezone plugin (adapter) for a deterministic (manual/fixed/sequential)
 * Time-Provider. Supports timezones and local time. Use with `createTimeProvider.for(plugin)`
 * from `@time-provider/core/deterministic`.
 */
export const plugin: IDeterministicPlugin<moment.Moment> = new DeterministicPlugin();
