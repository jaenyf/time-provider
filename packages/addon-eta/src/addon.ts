import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { EtaScheduler } from "./eta-scheduler.ts";
import type { WithEtaApi } from "./types.ts";

/**
 * What `.use()` actually needs to type the composed runtime with: an `eta` property, nothing
 * more. `EtaScheduler` itself no longer declares that property on itself (it would otherwise have
 * to point back at itself, since it's also what ends up *behind* `.eta` - see
 * `eta-scheduler.ts`), so it no longer structurally satisfies this on its own; the cast in
 * {@link EtaAddonBuilder.create} is what bridges the two, once, right here.
 */
type EtaAddon<TDate> = WithEtaApi<TDate> & IAddon<TDate>;

class EtaAddonBuilder<TDate> extends AddonBuilderBase<TDate, EtaAddon<TDate>> {
  create(): EtaAddon<TDate> {
    return new EtaScheduler<TDate>() as unknown as EtaAddon<TDate>;
  }
}

/**
 * The ETA estimation addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `eta` property.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<EtaAddon<TDate>> {
  return new EtaAddonBuilder<TDate>(typeHint);
}
