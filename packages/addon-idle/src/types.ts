import type { IScheduledHandle } from "@time-provider/core";

/**
 * The shape this addon adds to a composed Time-Provider: an `idle` property exposing
 * {@link IIdleApi}.
 */
export type WithIdleApi = {
  /**
   * Schedules work to run when the host has spare time, via `request` - the host's real idle
   * periods on a system runtime, an idle period simulated against this runtime's own clock on a
   * deterministic one. See {@link IIdleApi}.
   */
  idle: IIdleApi;
};

/**
 * The idle API facade this addon adds to a composed Time-Provider, reachable as
 * `timeProvider.idle` once composed via `createTimeProvider.for(plugin).use(thisAddon)`.
 */
export interface IIdleApi {
  /**
   * Schedules `callback` to run once, when the host considers itself idle.
   * On a system (real time) runtime this depends on the host's native implementation - the
   * callback may be delayed for as long as the host stays busy. On a deterministic runtime, it
   * fires once this runtime's own "now" has moved forward by the simulated idle delay - see
   * {@link DeterministicIdleScheduler.idleDelay}.
   *
   * Matches the native `requestIdleCallback` contract: fires exactly once, not repeatedly - call
   * it again from within the callback to keep polling for idle time. Cancel it, same as every
   * other scheduling API in this library, via `dispose()` on the returned handle rather than a
   * separate cancel method - a no-op if it already ran or was already disposed.
   */
  request(callback: () => void): IScheduledHandle;
}
