import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { CompatRuntime } from "./compat-runtime.ts";
import type { WithCompatApi } from "./types.ts";

export type { ICompatApi, WithCompatApi } from "./types.ts";
export { CompatRuntime } from "./compat-runtime.ts";

type DeterministicCompatAddon<TDate> = WithCompatApi<TDate> & IDeterministicAddon<TDate>;

class DeterministicCompatAddonBuilder<TDate> extends AddonBuilderBase<
  TDate,
  DeterministicCompatAddon<TDate>
> {
  create(): DeterministicCompatAddon<TDate> {
    return new CompatRuntime<TDate>() as unknown as DeterministicCompatAddon<TDate>;
  }
}

/**
 * The compat addon-builder for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)`. Same {@link CompatRuntime} implementation as the
 * system addon-builder in `./addon.ts` - it never touches anything deterministic-specific -
 * re-exposed here typed against `IDeterministicAddon` so it satisfies a deterministic
 * runtime-builder's `.use()` bound.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<DeterministicCompatAddon<TDate>> {
  return new DeterministicCompatAddonBuilder<TDate>(typeHint);
}
export default addon;
