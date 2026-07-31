import type { IDeterministicTimeProviderAddon } from "@time-provider/core/deterministic";
import { AddonHelper } from "@time-provider/core";
import { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame.ts";
import { type WithAnimationFrameApi } from "./types.ts";

export type {
  AnimationFrameHandle,
  IAnimationFrameApi as IAnimationFrameScheduler,
} from "./types.ts";
export { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame.ts";

export interface IAnimationFrameBuilderExtra {
  withHostFramesRate<TBuilder>(this: TBuilder, rate: number): TBuilder;
}

export function createAddon<TDate>(): IDeterministicTimeProviderAddon<
  TDate,
  WithAnimationFrameApi
> &
  IAnimationFrameBuilderExtra {
  let hostFramesRate: number | undefined;
  return {
    applyToRuntime(runtime) {
      const scheduler = new DeterministicAnimationFrameScheduler(runtime.scheduler);
      if (hostFramesRate !== undefined) {
        scheduler.hostFramesRate = hostFramesRate;
      }
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "animation",
        scheduler,
        undefined as unknown as WithAnimationFrameApi,
      );
    },
    withHostFramesRate<TBuilder>(this: TBuilder, rate: number): TBuilder {
      hostFramesRate = rate;
      return this;
    },
    clone(): IDeterministicTimeProviderAddon<TDate, WithAnimationFrameApi> {
      const cloned = createAddon<TDate>();
      if (hostFramesRate !== undefined) {
        cloned.withHostFramesRate(hostFramesRate);
      }
      return cloned;
    },
  };
}

export const addon: IDeterministicTimeProviderAddon<unknown, WithAnimationFrameApi> &
  IAnimationFrameBuilderExtra = createAddon();
export default addon;
