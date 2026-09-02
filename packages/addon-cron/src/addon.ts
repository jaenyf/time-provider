import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { CronScheduler } from "./cron-scheduler.ts";
import type { WithCronApi } from "./types.ts";

/**
 * What `.use()` actually needs to type the composed runtime with: a `cron` property, nothing
 * more. `CronScheduler` itself no longer declares that property on itself (it would otherwise
 * have to point back at itself, since it's also what ends up *behind* `.cron` - see
 * `cron-scheduler.ts`), so it no longer structurally satisfies this on its own; the cast in
 * {@link CronAddonBuilder.create} is what bridges the two, once, right here.
 */
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
