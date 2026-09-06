import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { CompatRuntime } from "./compat-runtime.ts";
import type { WithCompatApi } from "./types.ts";

type CompatAddon<TDate> = WithCompatApi<TDate> & IAddon<TDate>;

class CompatAddonBuilder<TDate> extends AddonBuilderBase<TDate, CompatAddon<TDate>> {
  create(): CompatAddon<TDate> {
    return new CompatRuntime<TDate>() as unknown as CompatAddon<TDate>;
  }
}

/**
 * The compat addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add a `compat` property.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<CompatAddon<TDate>> {
  return new CompatAddonBuilder<TDate>(typeHint);
}
