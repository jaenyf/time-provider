import {
  AddonBase,
  ScheduledHandle,
  type IScheduledHandle,
  SCHEDULED_ANIMATION_KIND_FRAME,
  type IRuntime,
  AddonHelper,
} from "@time-provider/core";
import type { IAnimationFrameScheduler, WithAnimationFrameApi } from "./types.ts";

function throwAnimationFrameApiNotSupported(): never {
  throw new Error("Environment does not support Animation frame API (are you in a browser?)");
}

/**
 * Implements {@link IAnimationFrameScheduler} on top of the host's native
 * `requestAnimationFrame`/`cancelAnimationFrame`.
 */
export class SystemAnimationFrameScheduler<TDate>
  extends AddonBase<TDate>
  implements IAnimationFrameScheduler<TDate>, WithAnimationFrameApi<TDate>
{
  #isDisposed: boolean;
  /**
   * @throws if the host environment does not support `requestAnimationFrame`/`cancelAnimationFrame` (e.g. not a browser).
   */
  constructor() {
    super();
    if (typeof requestAnimationFrame !== "function") {
      throwAnimationFrameApiNotSupported();
    }
    if (typeof cancelAnimationFrame !== "function") {
      throwAnimationFrameApiNotSupported();
    }
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
    return new SystemAnimationFrameScheduler() as this;
  }

  scheduleFrame(callback: () => void): IScheduledHandle {
    return new ScheduledHandle(
      SCHEDULED_ANIMATION_KIND_FRAME,
      this.runtime,
      requestAnimationFrame(callback),
    );
  }
}
