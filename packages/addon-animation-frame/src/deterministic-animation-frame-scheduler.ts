import { type IScheduledHandle, type ITimers } from "@time-provider/core";
import type { AnimationFrameHandle, IAnimationFrameScheduler } from "./types.ts";

/**
 * Implements {@link IAnimationFrameScheduler} on top of a deterministic runtime's {@link IDeterministicRuntime},
 * simulating frames at {@link hostFramesRate} instead of relying on a real display refresh.
 */
export class DeterministicAnimationFrameScheduler implements IAnimationFrameScheduler {
  #hostFramesRate = 60;
  #hostFrameDurationMs = 1000 / 60;
  #timers: ITimers;
  #isDisposed: boolean;

  /**
   * @param timers the deterministic runtime's timers used to simulate frame callbacks.
   */
  constructor(timers: ITimers) {
    this.#timers = timers;
    this.#isDisposed = false;
  }

  dispose(): void {
    this.#isDisposed = true;
  }
  get isDisposed(): boolean {
    return this.#isDisposed;
  }
  [Symbol.dispose](): void {
    this.dispose();
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
    return this.#timers.once(
      { milliseconds: this.#hostFrameDurationMs },
      callback,
    ) as unknown as AnimationFrameHandle;
  }
  cancelAnimationFrame(handle: AnimationFrameHandle): void {
    (handle as unknown as IScheduledHandle).dispose();
  }
}
