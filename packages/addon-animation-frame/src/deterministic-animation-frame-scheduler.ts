import {
  AddonBase,
  AddonHelper,
  ScheduledHandleKind,
  type IScheduledHandle,
} from "@time-provider/core";
import type { AnimationFrameCallback, IDeterministicAnimationFrameScheduler } from "./types.ts";
import type { IDeterministicAddon, IDeterministicRuntime } from "@time-provider/core/deterministic";

const ANIMATION_FRAME_TAG = Symbol("animation frame");

// A class: a getter in an object literal makes every runtime survive into the old generation.
class AnimationFacade {
  readonly #scheduler: { readonly pendingCount: number };
  constructor(scheduler: { readonly pendingCount: number }) {
    this.#scheduler = scheduler;
  }
  get pendingCount(): number {
    return this.#scheduler.pendingCount;
  }
}

/** Deterministic {@link IDeterministicAnimationFrameScheduler} using simulated frames. */
export class DeterministicAnimationFrameScheduler<TDate>
  extends AddonBase<TDate, IDeterministicRuntime<TDate>>
  implements IDeterministicAddon<TDate>, IDeterministicAnimationFrameScheduler<TDate>
{
  #hostFramesRate = 60;
  #hostFrameDurationMs = 1000 / 60;
  #isDisposed: boolean;

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

  applyToRuntimeImpl(runtime: IDeterministicRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "scheduler.animation",
      Object.assign(new AnimationFacade(this), { scheduleFrame: this.scheduleFrame.bind(this) }),
      this,
    );
    // The native-shaped aliases, added only when the compat addon is composed before this one.
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "compat.requestAnimationFrame",
      this.scheduleFrame.bind(this),
      this,
      true,
    );
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "compat.cancelAnimationFrame",
      (handle: IScheduledHandle) => handle.dispose(),
      this,
      true,
    );
  }

  /** Simulated display refresh rate; defaults to `60`. */
  get hostFramesRate(): number {
    return this.#hostFramesRate;
  }

  /** Simulated display refresh rate; defaults to `60`. */
  set hostFramesRate(value: number) {
    if (!value || value < 0) {
      throw new Error(`Invalid host frame rate (value was "${String(value)}")`);
    }
    this.#hostFramesRate = value;
    this.#hostFrameDurationMs = 1000 / value;
  }

  get pendingCount(): number {
    return this.runtime.countSpecific(ANIMATION_FRAME_TAG);
  }

  scheduleFrame(callback: AnimationFrameCallback): IScheduledHandle {
    return this.runtime.specific(
      ANIMATION_FRAME_TAG,
      ScheduledHandleKind.timeout,
      { milliseconds: this.#hostFrameDurationMs },
      () => callback(this.runtimeClock.monotonicNow()),
    );
  }
}
