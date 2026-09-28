import type {
  DurationMilliseconds,
  EpochMilliseconds,
  IScheduledHandle,
  ITimingMark,
  ITimingMarkOptions,
  ITimingMeasure,
  ITimingMeasureOptions,
  MonotonicMilliseconds,
} from "@time-provider/core";

/** The kind of a {@link IPerformanceEntry}. */
export type PerformanceEntryType =
  | "dns" // Node.js only
  | "function" // Node.js only
  | "gc" // Node.js only
  | "http2" // Node.js only
  | "http" // Node.js only
  | "mark" // available on the Web
  | "measure" // available on the Web
  | "net" // Node.js only
  | "node" // Node.js only
  | "resource"; // available on the Web

/** A performance timeline entry. */
export interface IPerformanceEntry {
  readonly name: string;
  readonly entryType: PerformanceEntryType;
  readonly startTime: MonotonicMilliseconds;
  readonly duration: DurationMilliseconds;
  toJSON(): unknown;
}

/** Adds `compat` to a composed Time-Provider. */
export type WithCompatApi<TDate> = {
  /** Compatibility API facade. */
  compat: ICompatApi<TDate>;
};

/** Native-shaped `performance` members backed by the Time-Provider clock and timings. */
export interface ICompatPerformance {
  /** Returns milliseconds relative to {@link ICompatPerformance.timeOrigin}. */
  now(): MonotonicMilliseconds;

  /** Unix timestamp at the start of this performance timeline. */
  readonly timeOrigin: EpochMilliseconds;

  /** Returns performance entries. */
  getEntries(): readonly IPerformanceEntry[];

  /** Returns entries with the given name. */
  getEntriesByName(name: string, entryType?: PerformanceEntryType): readonly IPerformanceEntry[];

  /** Returns entries of the given type. */
  getEntriesByType(entryType: PerformanceEntryType): readonly IPerformanceEntry[];

  /** Creates a timestamp marker. */
  mark(name: string, options?: ITimingMarkOptions): ITimingMark;

  /** Creates a measured duration. */
  measure(
    name: string,
    startMarkOrOptions?: string | ITimingMeasureOptions,
    endMark?: string,
  ): ITimingMeasure;

  /** Removes marks. */
  clearMarks(name?: string): void;

  /** Removes measures. */
  clearMeasures(name?: string): void;
}

/**
 * Compatibility API backed by the Time-Provider clock, timings and timers.
 */
// Kept generic over TDate for symmetry with WithCompatApi<TDate>, even though no member here
// happens to reference it.
// oxlint-disable-next-line no-unused-vars
export interface ICompatApi<TDate> {
  /** Native-shaped `performance` members. */
  readonly performance: ICompatPerformance;

  /**
   * Schedules `callback(...args)` after `millisecondsDelay`; defaults to `0`.
   * @throws None beyond underlying timer behavior.
   */
  setTimeout<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    millisecondsDelay?: number,
    ...args: TArgs
  ): IScheduledHandle;

  /** Cancels a timeout. */
  clearTimeout(handle: IScheduledHandle): void;

  /**
   * Schedules `callback(...args)` every `millisecondsDelay`; defaults to `0`, with a minimum
   * effective interval of `1ms`.
   */
  setInterval<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    millisecondsDelay?: number,
    ...args: TArgs
  ): IScheduledHandle;

  /** Cancels an interval. */
  clearInterval(handle: IScheduledHandle): void;

  /** Queues `callback` at the next microtask checkpoint. */
  queueMicrotask(callback: () => void): void;
}
