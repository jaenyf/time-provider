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
    AddonHelper.extendRuntimeWithProperty(runtime, "compat", this.#createFacade(), this);
  }

  /**
   * The performance members are pass-throughs, so they read the runtime's own performance API at
   * call time rather than capturing it here: an addon has no runtime to read it from until
   * `applyToRuntime` - which builds this facade - has returned.
   */
  #createFacade(): ICompatApi<TDate> {
    const runtimePerformance = () => this.runtimePerformance;
    return {
      setTimeout: this.setTimeout.bind(this),
      clearTimeout: this.clearTimeout.bind(this),
      setInterval: this.setInterval.bind(this),
      clearInterval: this.clearInterval.bind(this),
      setRecurring: this.setRecurring.bind(this),
      clearRecurring: this.clearRecurring.bind(this),
      now: () => runtimePerformance().now(),
      get timeOrigin() {
        return runtimePerformance().timeOrigin;
      },
      getEntries: () => runtimePerformance().getEntries(),
      getEntriesByName: (name, entryType) => runtimePerformance().getEntriesByName(name, entryType),
      getEntriesByType: (entryType) => runtimePerformance().getEntriesByType(entryType),
      mark: (name, options) => runtimePerformance().mark(name, options),
      measure: (name, startMarkOrOptions) => runtimePerformance().measure(name, startMarkOrOptions),
      clearMarks: (name) => runtimePerformance().clearMarks(name),
      clearMeasures: (name) => runtimePerformance().clearMeasures(name),
    };
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
