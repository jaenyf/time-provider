import type { IDeterministicTimeProviderAddon } from "@time-provider/core/deterministic";
import { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame.ts";
import { defineAnimationProperty, type WithAnimation } from "./define-animation-property.ts";

export type { AnimationFrameHandle, IAnimationFrameScheduler } from "./types.ts";
export { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame.ts";

/**
 * Creates a `.use(...)`-composable addon that adds `.animation` -
 * requestAnimationFrame/cancelAnimationFrame - to a deterministic
 * Time-Provider, simulated against that runtime's own clock.
 * `options.hostFramesRate` sets the simulated frame rate driving it
 * (defaults to 60hz). See `@time-provider/addon-animation-frame` for the
 * system-runtime counterpart.
 */
function createAnimationFrameAddon<TDate>(options?: {
  hostFramesRate?: number;
}): IDeterministicTimeProviderAddon<TDate, WithAnimation> {
  return {
    applyToDeterministic(runtime) {
      const scheduler = new DeterministicAnimationFrameScheduler(runtime.scheduler);
      if (options?.hostFramesRate !== undefined) {
        scheduler.hostFramesRate = options.hostFramesRate;
      }
      return defineAnimationProperty(runtime, scheduler);
    },
  };
}

/** The animation-frame addon for a deterministic Time-Provider, using the default 60hz simulated frame rate. */
export const addon: IDeterministicTimeProviderAddon<unknown, WithAnimation> =
  createAnimationFrameAddon();
