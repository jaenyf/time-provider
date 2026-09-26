/** Moment.js + moment-timezone plugin for deterministic Time-Provider runtimes.
 * @module */
import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";
import moment from "moment-timezone";

/**
 * moment-timezone adapter for deterministic (manual/fixed/sequential) Time-Providers.
 * Supports timezones and local time. Use with `createTimeProvider.for(plugin)`.
 */
export const plugin: IDeterministicPlugin<moment.Moment> = new DeterministicPlugin();
