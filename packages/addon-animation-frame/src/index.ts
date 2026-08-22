import { AddonHelper, type ISystemAddon } from "@time-provider/core";
import { type WithAnimationFrameApi } from "./types.ts";
import { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";

export type {
  AnimationFrameHandle,
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";

function createAddon<TDate>(): ISystemAddon<TDate, WithAnimationFrameApi> {
  return {
    applyToRuntime(runtime) {
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "animation",
        new SystemAnimationFrameScheduler(),
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
