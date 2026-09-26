import { AddonBuilderBase, type IAddonBuilder, type ISystemAddon } from "@time-provider/core";
import { CronScheduler } from "./cron-scheduler.ts";
import type { WithCronApi } from "./types.ts";

type CronAddon<TDate> = WithCronApi<TDate> & ISystemAddon<TDate>;

class CronAddonBuilder<TDate> extends AddonBuilderBase<TDate, CronAddon<TDate>> {
  create(): CronAddon<TDate> {
    return new CronScheduler<TDate>() as unknown as CronAddon<TDate>;
  }
}

/**
 * Cron addon builder.
 * @param typeHint Infers `TDate`; unused.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<CronAddon<TDate>> {
  return new CronAddonBuilder<TDate>(typeHint);
}
