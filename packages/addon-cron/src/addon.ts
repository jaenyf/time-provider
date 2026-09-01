import type { IAddonBuilder } from "@time-provider/core";
import { CronScheduler } from "./cron-scheduler.ts";

/**
 * The cron addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)`.
 */
export function addon<TDate>(): IAddonBuilder<CronScheduler<TDate>> {
  return { create: () => new CronScheduler<TDate>() };
}
