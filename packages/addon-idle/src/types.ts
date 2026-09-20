import type { IScheduledHandle } from "@time-provider/core";

/**
 * The shape this addon adds to a composed Time-Provider: a `scheduler.idle` property exposing
 * {@link IIdleApi}.
 */
export type WithIdleApi = {
  scheduler: {
    /**
     * Schedules work to run when the host has spare time, via `request` - the host's real idle
     * periods on a system runtime, requests held pending until explicitly drained on a
     * deterministic one. See {@link IIdleApi}.
     */
    idle: IIdleApi;
  };
  /**
   * Present only when the compat addon is composed as well, and composed first: the
   * native-shaped aliases for {@link IIdleApi.request}, sitting on that addon's `compat` facade
   * beside `setTimeout` and friends. `cancelIdleCallback` takes the handle
   * `requestIdleCallback` returned, not a numeric id, and is a no-op if the callback already
   * ran.
   */
  compat?: {
    requestIdleCallback(callback: () => void): IScheduledHandle;
    cancelIdleCallback(handle: IScheduledHandle): void;
  };
};

/**
 * The idle API facade this addon adds to a composed Time-Provider, reachable as
 * `timeProvider.scheduler.idle` once composed via `createTimeProvider.for(plugin).use(thisAddon)`.
 */
export interface IIdleApi {
  /**
   * Schedules `callback` to run once, when the host considers itself idle.
   * On a system (real time) runtime this depends on the host's native implementation - the
   * callback may be delayed for as long as the host stays busy. On a deterministic runtime, it
   * stays pending until explicitly declared idle - see {@link IDeterministicIdleApi.drain}.
   *
   * Matches the native `requestIdleCallback` contract: fires exactly once, not repeatedly - call
   * it again from within the callback to keep polling for idle time. Cancel it, same as every
   * other scheduling API in this library, via `dispose()` on the returned handle rather than a
   * separate cancel method - a no-op if it already ran or was already disposed.
   */
  request(callback: () => void): IScheduledHandle;
}

/**
 * The shape the deterministic idle addon adds to a composed Time-Provider: a `scheduler.idle`
 * property exposing {@link IDeterministicIdleApi}, which additionally lets a test declare the
 * runtime idle on demand.
 */
export type WithDeterministicIdleApi = {
  scheduler: {
    idle: IDeterministicIdleApi;
  };
  /**
   * Present only when the compat addon is composed as well, and composed first: the
   * native-shaped aliases for {@link IIdleApi.request}, sitting on that addon's `compat` facade
   * beside `setTimeout` and friends. `cancelIdleCallback` takes the handle
   * `requestIdleCallback` returned, not a numeric id, and is a no-op if the callback already
   * ran.
   */
  compat?: {
    requestIdleCallback(callback: () => void): IScheduledHandle;
    cancelIdleCallback(handle: IScheduledHandle): void;
  };
};

/**
 * The {@link IIdleApi} of a deterministic (fixed/manual/sequential) runtime, which additionally
 * lets a test run pending idle-requested callbacks on demand.
 *
 * There's no real notion of "idle" on a deterministic clock - unlike a timeout, nothing about
 * elapsed simulated time says the runtime has spare capacity - so a request made through
 * {@link IIdleApi.request} stays pending until this runs it: `advance()`/clock reads never fire
 * it on their own.
 */
export interface IDeterministicIdleApi extends IIdleApi {
  /**
   * Declares the runtime idle now, running up to `maxCount` pending idle-requested callbacks,
   * oldest request first.
   * @param maxCount how many pending idle callbacks this idle period allows through. Omit to run
   * everything currently pending.
   * @returns how many callbacks actually ran.
   */
  drain(maxCount?: number): number;
}
