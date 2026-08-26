import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import { CronScheduler } from "./cron-scheduler.ts";

class CronAddonBuilder<TDate> extends AddonBuilderBase<TDate, CronScheduler<TDate>> {
  create(): CronScheduler<TDate> {
    return new CronScheduler<TDate>();
  }
}

/**
 * The cron addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)`.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<CronScheduler<TDate>> {
  return new CronAddonBuilder<TDate>(typeHint);
}
