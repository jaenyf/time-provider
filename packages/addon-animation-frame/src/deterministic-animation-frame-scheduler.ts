import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { IAnimationFrameScheduler } from "./types.ts";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";

/**
 * Implements {@link IAnimationFrameScheduler} on top of a deterministic runtime's {@link IDeterministicRuntime},
 * simulating frames at {@link hostFramesRate} instead of relying on a real display refresh.
 */
export class DeterministicAnimationFrameScheduler<TDate>
  extends AddonBase<TDate>
  implements IDeterministicAddon<TDate>, IAnimationFrameScheduler<TDate>
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
    const facade: { scheduleFrame: (callback: () => void) => IScheduledHandle } = {
      scheduleFrame: this.scheduleFrame.bind(this),
    };
    Object.defineProperty(facade, "hostFramesRate", {
      enumerable: true,
      get: () => this.hostFramesRate,
      set: (value: number) => {
        this.hostFramesRate = value;
      },
    });
    AddonHelper.extendRuntimeWithProperty(runtime, "animation", facade, this);
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
