import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import { CompatRuntime } from "./compat-runtime.ts";

class CompatAddonBuilder<TDate> extends AddonBuilderBase<TDate, CompatRuntime<TDate>> {
  create(): CompatRuntime<TDate> {
    return new CompatRuntime<TDate>();
  }
}

/**
 * The compat addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add a `compat` property.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<CompatRuntime<TDate>> {
  return new CompatAddonBuilder<TDate>(typeHint);
}
