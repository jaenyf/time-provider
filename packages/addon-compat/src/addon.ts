import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { CompatRuntime } from "./compat-runtime.ts";
import type { WithCompatApi } from "./types.ts";

/**
 * What `.use()` actually needs to type the composed runtime with: a `compat` property, nothing
 * more. `CompatRuntime` itself no longer declares that property on itself (it would otherwise
 * have to point back at itself, since it's also what ends up *behind* `.compat` - see
 * `compat-runtime.ts`), so it no longer structurally satisfies this on its own; the cast in
 * {@link CompatAddonBuilder.create} is what bridges the two, once, right here.
 */
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
