import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./plugin/deterministic-runtimes.ts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * The Day.js plugin (adapter) for a deterministic (manual/fixed/sequential) Time-Provider.
 * Supports timezones and local time. Use with `createTimeProvider.for(plugin)` from
 * `@time-provider/core/deterministic`.
 */
export const plugin: IDeterministicPlugin<dayjs.Dayjs> = new DeterministicPlugin();
