import type { ISystemTimeProviderAddon } from "@time-provider/core";
import { defineAnimationProperty, type WithAnimation } from "./define-animation-property.ts";
import { SystemAnimationFrameScheduler } from "./system-animation-frame.ts";

export type { AnimationFrameHandle, IAnimationFrameScheduler } from "./types.ts";
export { SystemAnimationFrameScheduler } from "./system-animation-frame.ts";

function createAddon<TDate>(): ISystemTimeProviderAddon<TDate, WithAnimation> {
  return {
    applyToSystem(runtime) {
      return defineAnimationProperty(runtime, new SystemAnimationFrameScheduler());
    },
    clone(): ISystemTimeProviderAddon<TDate, WithAnimation> {
      return createAddon<TDate>();
    },
  };
}

/** The animation-frame addon for a system (real time) Time-Provider. */
export const addon: ISystemTimeProviderAddon<unknown, WithAnimation> = createAddon();
export default addon;
