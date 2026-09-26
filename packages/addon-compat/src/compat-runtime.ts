import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { ICompatApi, IPerformanceEntry } from "./types.ts";

/** Implements {@link ICompatApi} using core APIs. */
export class CompatRuntime<TDate> extends AddonBase<TDate, IRuntime<TDate>> {
  #isDisposed: boolean;
  #readsHostTimeline: boolean;

  /**
   * @param readsHostTimeline Whether readers use the host performance timeline.
   */
  constructor(readsHostTimeline: boolean) {
    super();
    this.#isDisposed = false;
    this.#readsHostTimeline = readsHostTimeline;
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

  /** Creates the compatibility facade from the attached runtime. */
  #createFacade(): ICompatApi<TDate> {
    const clock = () => this.runtimeClock;
    const timings = () => this.runtimeTimings;
    const entries = (): readonly IPerformanceEntry[] =>
      this.#readsHostTimeline
        ? (performance.getEntries() as unknown as IPerformanceEntry[])
        : timings().entries();
    return {
      setTimeout: this.setTimeout.bind(this),
      clearTimeout: this.clearTimeout.bind(this),
      setInterval: this.setInterval.bind(this),
      clearInterval: this.clearInterval.bind(this),
      queueMicrotask: this.queueMicrotask.bind(this),
      now: () => clock().monotonicNow(),
      get timeOrigin() {
        return clock().monotonicOrigin;
      },
      getEntries: entries,
      getEntriesByName: (name, entryType) =>
        entries().filter(
          (entry) =>
            entry.name === name && (entryType === undefined || entry.entryType === entryType),
        ),
      getEntriesByType: (entryType) => entries().filter((entry) => entry.entryType === entryType),
      mark: (name, options) => timings().mark(name, options),
      measure: (name, startMarkOrOptions) =>
        timings().measure(
          name,
          typeof startMarkOrOptions === "string"
            ? { start: startMarkOrOptions }
            : startMarkOrOptions,
        ),
      clearMarks: (name) => timings().clear({ kind: "mark", name }),
      clearMeasures: (name) => timings().clear({ kind: "measure", name }),
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
  queueMicrotask(callback: () => void): void {
    this.runtimeMicrotasks.queue(callback);
  }
}
