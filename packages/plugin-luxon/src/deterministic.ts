/** Luxon plugin for Time-Provider's deterministic runtimes.
 * @module */
import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";
import { DateTime } from "luxon";

/** Luxon adapter for deterministic (manual/fixed/sequential) Time-Providers. Supports timezones and local time. */
export const plugin: IDeterministicPlugin<DateTime> = new DeterministicPlugin();
