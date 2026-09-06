import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { CronScheduler } from "./cron-scheduler.ts";
import type { WithCronApi } from "./types.ts";

type CronAddon<TDate> = WithCronApi<TDate> & IAddon<TDate>;

class CronAddonBuilder<TDate> extends AddonBuilderBase<TDate, CronAddon<TDate>> {
  create(): CronAddon<TDate> {
    return new CronScheduler<TDate>() as unknown as CronAddon<TDate>;
  }
}

/**
 * The cron addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)`.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<CronAddon<TDate>> {
  return new CronAddonBuilder<TDate>(typeHint);
}
