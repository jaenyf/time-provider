import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { ICompatApi } from "./types.ts";

/**
 * Implements {@link ICompatApi} that performs underlying calls to core.
 */
export class CompatRuntime<TDate> extends AddonBase<TDate, IRuntime<TDate>> {
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

  applyToRuntimeImpl(runtime: IRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "compat",
      {
        setTimeout: this.setTimeout.bind(this),
        clearTimeout: this.clearTimeout.bind(this),
        setInterval: this.setInterval.bind(this),
        clearInterval: this.clearInterval.bind(this),
        setRecurring: this.setRecurring.bind(this),
        clearRecurring: this.clearRecurring.bind(this),
      } satisfies ICompatApi<TDate>,
      this,
    );
  }

  setTimeout(callback: () => void, millisecondsDelay?: number): IScheduledHandle {
    return this.runtimeTimers.once({ milliseconds: millisecondsDelay ?? 0 }, callback);
  }
  clearTimeout(handle: IScheduledHandle): void {
    handle.dispose();
  }
  setInterval(callback: () => void, millisecondsDelay?: number): IScheduledHandle {
    return this.runtimeTimers.every({ milliseconds: millisecondsDelay ?? 0 }, callback);
  }
  clearInterval(handle: IScheduledHandle): void {
    handle.dispose();
  }
  setRecurring(callback: () => number | false, initialDelay?: number): IScheduledHandle {
    return this.runtimeTimers.recurring(
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
}
