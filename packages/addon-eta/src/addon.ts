import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import { EtaScheduler } from "./eta-scheduler.ts";

class EtaAddonBuilder<TDate> extends AddonBuilderBase<TDate, EtaScheduler<TDate>> {
  create(): EtaScheduler<TDate> {
    return new EtaScheduler<TDate>();
  }
}

/**
 * The ETA estimation addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `eta` property.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<EtaScheduler<TDate>> {
  return new EtaAddonBuilder<TDate>(typeHint);
}
