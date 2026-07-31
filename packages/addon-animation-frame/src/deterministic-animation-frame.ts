import type { IScheduler, SetTimeoutHandle } from "@time-provider/core";
import type { AnimationFrameHandle, IAnimationFrameApi } from "./types.ts";

/**
 * Implements {@link IAnimationFrameApi} on top of a deterministic runtime's {@link IScheduler},
 * simulating frames at {@link hostFramesRate} instead of relying on a real display refresh.
 */
export class DeterministicAnimationFrameScheduler implements IAnimationFrameApi {
  #hostFramesRate = 60;
  #hostFrameDurationMs = 1000 / 60;
  #scheduler: IScheduler;

  /**
   * @param scheduler the deterministic runtime's scheduler used to simulate frame callbacks.
   */
  constructor(scheduler: IScheduler) {
    this.#scheduler = scheduler;
  }

  /**
   * The simulated host display refresh rate driving `requestAnimationFrame`
   * on this scheduler (defaults to 60hz).
   */
  get hostFramesRate(): number {
    return this.#hostFramesRate;
  }
  /**
   * The simulated host display refresh rate driving `requestAnimationFrame`
   * on this scheduler (defaults to 60hz).
   */
  set hostFramesRate(value: number) {
    if (!value || value < 0) {
      throw new Error(`Invalid host frame rate (value was "${String(value)}")`);
    }
    this.#hostFramesRate = value;
    this.#hostFrameDurationMs = 1000 / value;
  }

  requestAnimationFrame(callback: () => void): AnimationFrameHandle {
    return this.#scheduler.setTimeout(
      callback,
      this.#hostFrameDurationMs,
    ) as unknown as AnimationFrameHandle;
  }
  cancelAnimationFrame(handle: AnimationFrameHandle): void {
    this.#scheduler.clearTimeout(handle as unknown as SetTimeoutHandle);
  }
}
