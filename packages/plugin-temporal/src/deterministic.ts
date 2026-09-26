/** Temporal plugin for deterministic Time-Provider runtimes.
 * @module */
import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";

/** Temporal (`Temporal.ZonedDateTime`) adapter for deterministic (manual/fixed/sequential) Time-Providers. Supports timezones and local time. */
export const plugin: IDeterministicPlugin<Temporal.ZonedDateTime> = new DeterministicPlugin();
