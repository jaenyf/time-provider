import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { IAnimationFrameScheduler, WithAnimationFrameApi } from "./types.ts";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";

/**
 * Implements {@link IAnimationFrameScheduler} on top of a deterministic runtime's {@link IDeterministicRuntime},
 * simulating frames at {@link hostFramesRate} instead of relying on a real display refresh.
 */
export class DeterministicAnimationFrameScheduler<TDate>
  extends AddonBase<TDate>
  implements
    IDeterministicAddon<TDate>,
    IAnimationFrameScheduler<TDate>,
    WithAnimationFrameApi<TDate>
{
  #hostFramesRate = 60;
  #hostFrameDurationMs = 1000 / 60;
  #isDisposed: boolean;

  /**
   * @param timers the deterministic runtime's timers used to simulate frame callbacks.
   */
  constructor() {
    super();
    this.#isDisposed = false;
  }

  get animation(): IAnimationFrameScheduler<TDate> {
    return this;
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

  applyToRuntimeImpl(runtime: IRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(runtime, "animation", this);
  }

  clone(): this {
    return new DeterministicAnimationFrameScheduler<TDate>() as this;
  }

  withHostFramesRate(rate: number): typeof this {
    this.hostFramesRate = rate;
    return this;
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

  scheduleFrame(callback: () => void): IScheduledHandle {
    return this.runtime.timers.once({ milliseconds: this.#hostFrameDurationMs }, callback);
  }
}
