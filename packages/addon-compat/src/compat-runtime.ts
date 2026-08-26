import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { ICompatApi, ITimers, WithCompatApi } from "./types.ts";

/**
 * Implements {@link ICompatApi} that performs underlying calls to core.
 */
export class CompatRuntime<TDate>
  extends AddonBase<TDate>
  implements ICompatApi<TDate>, ITimers, WithCompatApi<TDate>
{
  #isDisposed: boolean;
  constructor() {
    super();
    this.#isDisposed = false;
  }

  get compat(): ICompatApi<TDate> {
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
    AddonHelper.extendRuntimeWithProperty(runtime, "compat", this);
  }

  setTimeout(callback: () => void, millisecondsDelay?: number): IScheduledHandle {
    return this.runtime.once({ milliseconds: millisecondsDelay ?? 0 }, callback);
  }
  clearTimeout(handle: IScheduledHandle): void {
    handle.dispose();
  }
  setInterval(callback: () => void, millisecondsDelay?: number): IScheduledHandle {
    return this.runtime.every({ milliseconds: millisecondsDelay ?? 0 }, callback);
  }
  clearInterval(handle: IScheduledHandle): void {
    handle.dispose();
  }
  setRecurring(callback: () => number | false, initialDelay?: number): IScheduledHandle {
    return this.runtime.recurring(
      () => {
        const result = callback();
        if (result === false) {
          return false;
        }
        return { milliseconds: result };
      },
      { milliseconds: initialDelay ?? 0 },
    );
  }
  clearRecurring(handle: IScheduledHandle): void {
    handle.dispose();
  }
  get timers(): ITimers {
    return this;
  }
}
