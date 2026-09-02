import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";
import type { WithAnimationFrameApi } from "./types.ts";

/**
 * What `.use()` actually needs to type the composed runtime with: an `animation` property,
 * nothing more. `SystemAnimationFrameScheduler` itself no longer declares that property on
 * itself (it would otherwise have to point back at itself, since it's also what ends up *behind*
 * `.animation` - see `system-animation-frame-scheduler.ts`), so it no longer structurally
 * satisfies this on its own; the cast in {@link SystemAnimationFrameAddonBuilder.create} is what
 * bridges the two, once, right here.
 */
type SystemAnimationFrameAddon<TDate> = WithAnimationFrameApi<TDate> & IAddon<TDate>;

class SystemAnimationFrameAddonBuilder<TDate> extends AddonBuilderBase<
  TDate,
  SystemAnimationFrameAddon<TDate>
> {
  create(): SystemAnimationFrameAddon<TDate> {
    return new SystemAnimationFrameScheduler<TDate>() as unknown as SystemAnimationFrameAddon<TDate>;
  }
}

/**
 * The animation-frame addon-builder for a system (real time) Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `animation` property backed by the
 * host's real `requestAnimationFrame`.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<SystemAnimationFrameAddon<TDate>> {
  return new SystemAnimationFrameAddonBuilder<TDate>(typeHint);
}
