import type { IDeterministicTimeProviderAddon } from "@time-provider/core/deterministic";
import { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame.ts";
import { defineAnimationProperty, type WithAnimation } from "./define-animation-property.ts";

export type { AnimationFrameHandle, IAnimationFrameScheduler } from "./types.ts";
export { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame.ts";

export interface IAnimationFrameBuilderExtra {
  withHostFramesRate<TBuilder>(this: TBuilder, rate: number): TBuilder;
}

export function createAddon<TDate>(): IDeterministicTimeProviderAddon<TDate, WithAnimation> &
  IAnimationFrameBuilderExtra {
  let hostFramesRate: number | undefined;
  return {
    applyToRuntime(runtime) {
      const scheduler = new DeterministicAnimationFrameScheduler(runtime.scheduler);
      if (hostFramesRate !== undefined) {
        scheduler.hostFramesRate = hostFramesRate;
      }
      return defineAnimationProperty(runtime, scheduler);
    },
    withHostFramesRate<TBuilder>(this: TBuilder, rate: number): TBuilder {
      hostFramesRate = rate;
      return this;
    },
    clone(): IDeterministicTimeProviderAddon<TDate, WithAnimation> {
      const cloned = createAddon<TDate>();
      if (hostFramesRate !== undefined) {
        cloned.withHostFramesRate(hostFramesRate);
      }
      return cloned;
    },
  };
}

export const addon: IDeterministicTimeProviderAddon<unknown, WithAnimation> &
  IAnimationFrameBuilderExtra = createAddon();
export default addon;
