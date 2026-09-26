/** Native `Date` plugin for Time-Provider's system runtime.
 * @module */
import type { IUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemPlugin } from "./plugin/system.ts";

/** Native `Date` adapter for the system (real time) Time-Provider. UTC only; no external date library dependency. */
export const plugin: IUtcOnlySystemPlugin<Date> = new SystemPlugin();
