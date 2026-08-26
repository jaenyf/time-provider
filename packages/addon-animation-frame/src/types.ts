import type { IAddon, IScheduledHandle } from "@time-provider/core";

/**
 * The shape this addon adds to a composed Time-Provider: an `animation` property exposing
 * {@link IAnimationFrameScheduler}.
 */
export type WithAnimationFrameApi<TDate> = {
  /**
   * Schedules work to run before the next host frame update, via `requestAnimationFrame`/
   * `cancelAnimationFrame` - the host's real frames on a system runtime, frames simulated against
   * this runtime's own clock on a deterministic one. See {@link IAnimationFrameScheduler}.
   */
  animation: IAnimationFrameScheduler<TDate>;
};

/**
 * The animation-frame API facade this addon adds to a composed Time-Provider,
 * reachable as `timeProvider.animation` once composed via
 * `createTimeProvider.for(plugin).use(thisAddon)`.
 */
export interface IAnimationFrameScheduler<TDate>
  extends IAddon<TDate>, WithAnimationFrameApi<TDate> {
  /**
   * Schedules frame `callback` to run once, before the next host frame update.
   * On a system (real time) runtime this depends on the host display refresh
   * rate (common values are 60hz, 75hz, 90hz, 120hz, 144hz and 240hz). On a
   * deterministic runtime, it fires once this runtime's own "now" has moved
   * forward by at least one simulated frame duration - see
   * {@link DeterministicAnimationFrameScheduler.hostFramesRate}.
   *
   * Matches the native `requestAnimationFrame` contract: fires exactly once,
   * not repeatedly - call it again from within the callback to keep animating.
   */
  scheduleFrame(callback: () => void): IScheduledHandle;
}
