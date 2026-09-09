import { AddonBuilderBase, type IAddon, type IAddonBuilder } from "@time-provider/core";
import { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";
import type { WithAnimationFrameApi } from "./types.ts";
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
