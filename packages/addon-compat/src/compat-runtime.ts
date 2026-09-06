import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { ITimers } from "./types.ts";

/**
 * Implements {@link ICompatApi} that performs underlying calls to core.
 */
export class CompatRuntime<TDate> extends AddonBase<TDate> {
  #isDisposed: boolean;
  #timersFacade?: ITimers;

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
    AddonHelper.extendRuntimeWithProperty(runtime, "compat", { timers: this.timers }, this);
  }

  get timers(): ITimers {
    return (this.#timersFacade ??= {
      setTimeout: this.setTimeout.bind(this),
      clearTimeout: this.clearTimeout.bind(this),
      setInterval: this.setInterval.bind(this),
      clearInterval: this.clearInterval.bind(this),
      setRecurring: this.setRecurring.bind(this),
      clearRecurring: this.clearRecurring.bind(this),
    });
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
}
