import type { IScheduledHandle } from "@time-provider/core";

/**
 * Adds `scheduler.idle` exposing {@link IIdleApi}.
 */
export type WithIdleApi = {
  scheduler: {
    /** Schedules work for host idle time; deterministic runtimes wait for explicit drain. */
    idle: IIdleApi;
  };
  /**
   * Native-shaped idle aliases when the compat addon is composed first.
   * `cancelIdleCallback` takes the returned handle and is a no-op after execution.
   */
  compat?: {
    requestIdleCallback(callback: () => void): IScheduledHandle;
    cancelIdleCallback(handle: IScheduledHandle): void;
  };
};

/**
 * Idle scheduling API exposed as `timeProvider.scheduler.idle`.
 */
export interface IIdleApi {
  /**
   * Schedules `callback` once for idle time.
   * System runtimes use the host's native implementation; deterministic runtimes wait for
   * {@link IDeterministicIdleApi.drain}.
   * Dispose the returned handle to cancel; disposing an already-run or disposed handle is a no-op.
   */
  request(callback: () => void): IScheduledHandle;
}

/**
 * Adds {@link IDeterministicIdleApi} as `scheduler.idle`, including explicit idle draining.
 */
export type WithDeterministicIdleApi = {
  scheduler: {
    idle: IDeterministicIdleApi;
  };
  /**
   * Native-shaped idle aliases when the compat addon is composed first.
   * `cancelIdleCallback` takes the returned handle and is a no-op after execution.
   */
  compat?: {
    requestIdleCallback(callback: () => void): IScheduledHandle;
    cancelIdleCallback(handle: IScheduledHandle): void;
  };
};

/**
 * {@link IIdleApi} for deterministic runtimes; pending idle callbacks run only when explicitly
 * drained.
 */
export interface IDeterministicIdleApi extends IIdleApi {
  /**
   * Runs up to `maxCount` pending idle callbacks, oldest first.
   * @param maxCount Maximum callbacks to run; omit to run all pending.
   * @returns Number of callbacks run.
   */
  drain(maxCount?: number): number;
}
