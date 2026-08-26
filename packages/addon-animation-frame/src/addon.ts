import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";

class SystemAnimationFrameAddonBuilder<TDate> extends AddonBuilderBase<
  TDate,
  SystemAnimationFrameScheduler<TDate>
> {
  create(): SystemAnimationFrameScheduler<TDate> {
    return new SystemAnimationFrameScheduler<TDate>();
  }
}

/**
 * The animation-frame addon-builder for a system (real time) Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `animation` property backed by the
 * host's real `requestAnimationFrame`.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(
  typeHint?: TDate,
): IAddonBuilder<SystemAnimationFrameScheduler<TDate>> {
  return new SystemAnimationFrameAddonBuilder<TDate>(typeHint);
}
