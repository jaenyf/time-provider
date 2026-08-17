import type { IRuntime } from "@time-provider/core";
import type { DueHandle, ICompatApi, ITimers } from "./types.ts";

/**
 * Implements {@link ICompatApi} that performs underlying calls to core.
 */
export class CompatRuntime<TDate> implements ICompatApi, ITimers {
  #runtime: IRuntime<TDate>;
  constructor(runtime: IRuntime<TDate>) {
    this.#runtime = runtime;
  }

  setTimeout(callback: () => void, millisecondsDelay?: number): DueHandle {
    return this.#runtime.setTimeout(callback, millisecondsDelay);
  }
  clearTimeout(handle: DueHandle): void {
    this.#runtime.clearTimeout(handle);
  }
  setInterval(callback: () => void, millisecondsDelay?: number): DueHandle {
    return this.#runtime.setInterval(callback, millisecondsDelay);
  }
  clearInterval(handle: DueHandle): void {
    this.#runtime.clearInterval(handle);
  }
  setRecurring(callback: () => number | false, initialDelay?: number): DueHandle {
    return this.#runtime.setRecurring(callback, initialDelay);
  }
  clearRecurring(handle: DueHandle): void {
    this.#runtime.clearRecurring(handle);
  }
  get timers(): ITimers {
    return this;
  }
}
