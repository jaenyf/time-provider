import {
  toDuration,
  type DurationMilliseconds,
  type IRuntime,
  type ITimerHandle,
} from "@time-provider/core";
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
    return this.#runtime.once(toDuration({ milliseconds: millisecondsDelay ?? 0 }), callback);
  }
  clearTimeout(handle: ITimerHandle): void {
    handle.dispose();
  }
  setInterval(callback: () => void, millisecondsDelay?: number): DueHandle {
    return this.#runtime.every(toDuration({ milliseconds: millisecondsDelay ?? 0 }), callback);
  }
  clearInterval(handle: ITimerHandle): void {
    handle.dispose();
  }
  setRecurring(callback: () => number | false, initialDelay?: number): DueHandle {
    return this.#runtime.recurring(
      callback as () => DurationMilliseconds | false,
      toDuration({ milliseconds: initialDelay ?? 0 }),
    );
  }
  clearRecurring(handle: ITimerHandle): void {
    handle.dispose();
  }
  get timers(): ITimers {
    return this;
  }
}
