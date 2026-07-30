import type { ISystemTimeProviderAddon } from "@time-provider/core";
import { defineAnimationProperty, type WithAnimation } from "./define-animation-property.ts";
import { SystemAnimationFrameScheduler } from "./system-animation-frame.ts";

export type { AnimationFrameHandle, IAnimationFrameScheduler } from "./types.ts";
export { SystemAnimationFrameScheduler } from "./system-animation-frame.ts";

/**
 * Creates a `.use(...)`-composable addon that adds `.animation` -
 * requestAnimationFrame/cancelAnimationFrame - to a system (real time)
 * Time-Provider, passing through to the real requestAnimationFrame/
 * cancelAnimationFrame API. See `@time-provider/addon-animation-frame/deterministic`
 * for the deterministic-runtime counterpart.
 */
function createAnimationFrameAddon<TDate>(): ISystemTimeProviderAddon<TDate, WithAnimation> {
  return {
    applyToSystem(runtime) {
      return defineAnimationProperty(runtime, new SystemAnimationFrameScheduler());
    },
  };
}

/** The animation-frame addon for a system (real time) Time-Provider. */
export const addon: ISystemTimeProviderAddon<unknown, WithAnimation> = createAnimationFrameAddon();
