import { type IDeterministicAddon } from "@time-provider/core/deterministic";

export type {
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
  withHostFramesRate(rate: number): IDeterministicAddon<unknown>;
}

/**
 * The animation-frame addon for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `animation` property backed by the
 * runtime's own simulated clock instead of the host's real display refresh.
 */
// export const addon = function <TDate>() {
//   return new DeterministicAnimationFrameScheduler<TDate>();
// };
export const addon = DeterministicAnimationFrameScheduler;
export default addon;
