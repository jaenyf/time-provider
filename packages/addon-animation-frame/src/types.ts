import type { IAddon } from "@time-provider/core";

/**
 * A handle returned by {@link IAnimationFrameScheduler.requestAnimationFrame}, to be passed to
 * {@link IAnimationFrameScheduler.cancelAnimationFrame}.
 */
export type AnimationFrameHandle = ReturnType<typeof requestAnimationFrame>;

/**
 * The shape this addon adds to a composed Time-Provider: an `animation` property exposing
 * {@link IAnimationFrameScheduler}.
 */
export type WithAnimationFrameApi = {
  /**
   * Schedules work to run before the next host frame update, via `requestAnimationFrame`/
   * `cancelAnimationFrame` - the host's real frames on a system runtime, frames simulated against
   * this runtime's own clock on a deterministic one. See {@link IAnimationFrameScheduler}.
   */
  animation: IAnimationFrameScheduler;
};

/**
 * The animation-frame API facade this addon adds to a composed Time-Provider,
 * reachable as `timeProvider.animation` once composed via
 * `createTimeProvider.for(plugin).use(thisAddon)`.
 */
export interface IAnimationFrameScheduler extends IAddon {
  /**
   * Schedules `callback` to run once, before the next host frame update.
   * On a system (real time) runtime this depends on the host display refresh
   * rate (common values are 60hz, 75hz, 90hz, 120hz, 144hz and 240hz). On a
   * deterministic runtime, it fires once this runtime's own "now" has moved
   * forward by at least one simulated frame duration - see
   * {@link DeterministicAnimationFrameScheduler.hostFramesRate}.
   *
   * Matches the native `requestAnimationFrame` contract: fires exactly once,
   * not repeatedly - call it again from within the callback to keep animating.
   */
  requestAnimationFrame(callback: () => void): AnimationFrameHandle;
  /**
   * Cancels an animation frame request previously scheduled via
   * {@link IAnimationFrameScheduler.requestAnimationFrame}. A no-op if it
   * already ran or was already cancelled.
   */
  cancelAnimationFrame(handle: AnimationFrameHandle): void;
}
