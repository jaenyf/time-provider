import { AddonHelper, type ISystemAddon } from "@time-provider/core";
import { type WithAnimationFrameApi } from "./types.ts";
import { SystemAnimationFrameTimers } from "./system-animation-frame-timers.ts";

export type {
  AnimationFrameHandle,
  IAnimationFrameApi as IAnimationFrameScheduler,
  WithAnimationFrameApi,
} from "./types.ts";
export { SystemAnimationFrameTimers as SystemAnimationFrameScheduler } from "./system-animation-frame-timers.ts";

function createAddon<TDate>(): ISystemAddon<TDate, WithAnimationFrameApi> {
  return {
    applyToRuntime(runtime) {
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "animation",
        new SystemAnimationFrameTimers(),
        undefined as unknown as WithAnimationFrameApi,
      );
    },
    clone(): ISystemAddon<TDate, WithAnimationFrameApi> {
      return createAddon<TDate>();
    },
  };
}

/** The animation-frame addon for a system (real time) Time-Provider. */
export const addon: ISystemAddon<unknown, WithAnimationFrameApi> = createAddon();
export default addon;
