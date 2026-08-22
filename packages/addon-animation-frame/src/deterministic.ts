import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { AddonHelper } from "@time-provider/core";
import { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";
import { type WithAnimationFrameApi } from "./types.ts";

export type {
  AnimationFrameHandle,
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";

/**
 * Extra builder method contributed by the deterministic animation-frame addon when composed via
 * `createTimeProvider.for(plugin).use(addon)`.
 */
export interface IAnimationFrameBuilderExtra {
  /**
   * Sets the simulated host display refresh rate (in Hz) driving `requestAnimationFrame` on the
   * resulting Time-Provider's `animation` API. Defaults to 60.
   * @param rate the refresh rate in Hz.
   * @returns self, for chaining with the rest of the builder.
   */
  withHostFramesRate<TBuilder>(this: TBuilder, rate: number): TBuilder;
}

/**
 * Creates a new instance of the deterministic animation-frame addon. Most consumers should use
 * the {@link addon} singleton instead; call this directly only when a fresh, independently
 * configured instance is needed (e.g. to compose it with two different Time-Providers using
 * different {@link IAnimationFrameBuilderExtra.withHostFramesRate} settings).
 */
export function createAddon<TDate>(): IDeterministicAddon<TDate, WithAnimationFrameApi> &
  IAnimationFrameBuilderExtra {
  let hostFramesRate: number | undefined;
  return {
    applyToRuntime(runtime) {
      const scheduler = new DeterministicAnimationFrameScheduler(runtime.timers);
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
    clone(): IDeterministicAddon<TDate, WithAnimationFrameApi> {
      const cloned = createAddon<TDate>();
      if (hostFramesRate !== undefined) {
        cloned.withHostFramesRate(hostFramesRate);
      }
      return cloned;
    },
  };
}

/**
 * The animation-frame addon for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `animation` property backed by the
 * runtime's own simulated clock instead of the host's real display refresh.
 */
export const addon: IDeterministicAddon<unknown, WithAnimationFrameApi> &
  IAnimationFrameBuilderExtra = createAddon();
export default addon;
