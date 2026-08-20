import { type IRuntime, type ITimerHandle } from "@time-provider/core";
import type { DueHandle, ICompatApi, ITimers } from "./types.ts";

/**
 * Implements {@link ICompatApi} that performs underlying calls to core.
 */
export class CompatRuntime<TDate> implements ICompatApi, ITimers {
  #runtime: IRuntime<TDate>;
  #isDisposed: boolean;
  constructor(runtime: IRuntime<TDate>) {
    this.#runtime = runtime;
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

  setTimeout(callback: () => void, millisecondsDelay?: number): DueHandle {
    return this.#runtime.once({ milliseconds: millisecondsDelay ?? 0 }, callback);
  }
  clearTimeout(handle: ITimerHandle): void {
    handle.dispose();
  }
  setInterval(callback: () => void, millisecondsDelay?: number): DueHandle {
    return this.#runtime.every({ milliseconds: millisecondsDelay ?? 0 }, callback);
  }
  clearInterval(handle: ITimerHandle): void {
    handle.dispose();
  }
  setRecurring(callback: () => number | false, initialDelay?: number): DueHandle {
    return this.#runtime.recurring(
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
  clearRecurring(handle: ITimerHandle): void {
    handle.dispose();
  }
  get timers(): ITimers {
    return this;
  }
}
