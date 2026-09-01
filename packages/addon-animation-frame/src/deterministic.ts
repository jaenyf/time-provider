import type { IAddonBuilder } from "@time-provider/core/deterministic";
import { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";

export type {
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";

/**
 * Extra builder method contributed by the deterministic animation-frame addon-builder when
 * composed via `createTimeProvider.for(plugin).use(addon)`.
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
 * The animation-frame addon-builder for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `animation` property backed by the
 * runtime's own simulated clock instead of the host's real display refresh.
 *
 * `withHostFramesRate` closes over `hostFramesRate` rather than storing it on a class field:
 * `.use()` splices it onto the runtime-builder chain, so it actually runs with the runtime-builder
 * as `this`, not this addon-builder - a private class field wouldn't be reachable from there.
 */
export function addon<TDate>(): IAddonBuilder<DeterministicAnimationFrameScheduler<TDate>> &
  IAnimationFrameBuilderExtra {
  let hostFramesRate: number | undefined;
  return {
    withHostFramesRate<TBuilder>(this: TBuilder, rate: number): TBuilder {
      hostFramesRate = rate;
      return this;
    },
    create(): DeterministicAnimationFrameScheduler<TDate> {
      const scheduler = new DeterministicAnimationFrameScheduler<TDate>();
      if (hostFramesRate !== undefined) {
        scheduler.hostFramesRate = hostFramesRate;
      }
      return scheduler;
    },
  };
}
export default addon;
