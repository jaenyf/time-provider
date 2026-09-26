import { AddonBuilderBase, type IAddonBuilder, type ISystemAddon } from "@time-provider/core";
import { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";
import type { WithAnimationFrameApi } from "./types.ts";

type SystemAnimationFrameAddon<TDate> = WithAnimationFrameApi<TDate> & ISystemAddon<TDate>;

class SystemAnimationFrameAddonBuilder<TDate> extends AddonBuilderBase<
  TDate,
  SystemAnimationFrameAddon<TDate>
> {
  create(): SystemAnimationFrameAddon<TDate> {
    return new SystemAnimationFrameScheduler<TDate>() as unknown as SystemAnimationFrameAddon<TDate>;
  }
}

/** System Time-Provider animation-frame addon builder.
 * @param typeHint Infers `TDate`; unused.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<SystemAnimationFrameAddon<TDate>> {
  return new SystemAnimationFrameAddonBuilder<TDate>(typeHint);
}
