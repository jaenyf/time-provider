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

/**
 * The kind of a {@link IPerformanceEntry}.
 */
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

/**
 * A single entry on the performance timeline, as {@link ICompatApi.getEntries} returns it: a mark
 * or a measure, or on a system Time-Provider any entry the host recorded.
 */
export interface IPerformanceEntry {
  readonly name: string;
  readonly entryType: PerformanceEntryType;
  readonly startTime: MonotonicMilliseconds;
  readonly duration: DurationMilliseconds;
  toJSON(): unknown;
}

/**
 * The shape this addon adds to a composed Time-Provider: a `compat` property exposing
 * {@link ICompatApi}.
 */
export type WithCompatApi<TDate> = {
  /**
   * Provides low-level styles signatures methods - see {@link ICompatApi}.
   */
  compat: ICompatApi<TDate>;
};

/**
 * The compat API facade this addon adds to a composed Time-Provider, reachable as
 * `timeProvider.compat` once composed via `createTimeProvider.for(plugin).use(thisAddon)`.
 *
 * Schedules and cancels timeouts/intervals, and exposes the native `performance` members - `now`,
 * `timeOrigin`, `mark`, `measure`, the `getEntries*` readers and the `clear*` methods - flat
 * alongside them, so migrating code that calls both keeps one facade to reach for. They are
 * backed by `timeProvider.clock.monotonicNow()`/`monotonicOrigin` and `timeProvider.timings`.
 *
 * Execution model depends on the clock strategy backing these timers:
 * - On a **system** clock, callbacks run asynchronously via the real, native
 *   timers, exactly like in production code.
 * - On a **manual** or **sequential** clock, callbacks run synchronously,
 *   in-line, as soon as they become due - as a direct side effect of
 *   {@link ICompatApi.setTimeout}/{@link ICompatApi.setInterval} itself
 *   (e.g. a delay of `0` or a negative value is already due when scheduled),
 *   or of any call that moves the clock forward (`advance()`,
 *   `clock.localNow()`, `clock.utcNow()`). There is no event loop tick
 *   involved: a due callback has already run by the time the triggering call
 *   returns.
 * - On a **fixed** clock, time never advances, so no timer callback is
 *   ever due - it never runs, regardless of the delay it was registered with.
 *
 * On a manual/sequential clock, a callback that throws is handled to match what a native timer
 * callback throwing would actually do in the current environment: the error propagates out of the
 * triggering call in a Node-like environment, and is logged via `console.error` and swallowed in a
 * browser-like one.
 */
// Kept generic over TDate for symmetry with WithCompatApi<TDate>, even though no member here
// happens to reference it.
// oxlint-disable-next-line no-unused-vars
export interface ICompatApi<TDate> {
  /**
   * Returns the current high-resolution timestamp in milliseconds relative to
   * {@link ICompatApi.timeOrigin}.
   */
  now(): MonotonicMilliseconds;
  /**
   * The Unix timestamp at which this performance timeline started.
   */
  readonly timeOrigin: EpochMilliseconds;
  /**
   * Returns all performance entries. On a system Time-Provider that is the host's whole timeline,
   * including entries it records itself (`resource`, `navigation`...); on a deterministic one, the
   * marks and measures recorded on it.
   */
  getEntries(): readonly IPerformanceEntry[];
  /**
   * Returns performance entries with a specific name.
   */
  getEntriesByName(name: string, entryType?: PerformanceEntryType): readonly IPerformanceEntry[];
  /**
   * Returns performance entries of a specific type.
   */
  getEntriesByType(entryType: PerformanceEntryType): readonly IPerformanceEntry[];
  /**
   * Creates a timestamp marker.
   */
  mark(name: string, options?: ITimingMarkOptions): ITimingMark;
  /**
   * Creates a measured duration between marks or timestamps.
   */
  measure(name: string, startMarkOrOptions?: string | ITimingMeasureOptions): ITimingMeasure;
  /**
   * Removes marks.
   */
  clearMarks(name?: string): void;
  /**
   * Removes measures.
   */
  clearMeasures(name?: string): void;
  /**
   * Schedules `callback` to run once, `millisecondsDelay` milliseconds from
   * now (0 if omitted or negative).
   *
   * When it runs depends on the clock strategy: asynchronously via real native timers on a system
   * clock, synchronously and in-line the moment it becomes due on a manual/sequential clock, and
   * never on a fixed clock (time never advances there). See {@link ICompatApi} for the full model.
   */
  setTimeout(callback: () => void, millisecondsDelay?: number): IScheduledHandle;
  /**
   * Cancels a pending timeout scheduled via {@link ICompatApi.setTimeout}.
   * A no-op if it already ran or was already cleared.
   */
  clearTimeout(handle: IScheduledHandle): void;
  /**
   * Schedules `callback` to run repeatedly, every `millisecondsDelay`
   * milliseconds (0 if omitted or negative). No interval ever repeats faster
   * than once per millisecond: a system one clamps `millisecondsDelay` to 1
   * up front, and a deterministic one accepts 0 - firing immediately, since
   * it is already due - then re-arms every 1 millisecond, matching what a
   * native interval does with a delay of 0.
   *
   * When each run happens depends on the clock strategy: asynchronously via real native timers on
   * a system clock, synchronously and in-line as each run becomes due on a manual/sequential clock
   * (so an interval whose delay is shorter than an `advance()` re-fires as many times as fit), and
   * never on a fixed clock. See {@link ICompatApi} for the full model.
   */
  setInterval(callback: () => void, millisecondsDelay?: number): IScheduledHandle;
  /**
   * Cancels a pending interval scheduled via {@link ICompatApi.setInterval}.
   * A no-op if it was already cleared.
   */
  clearInterval(handle: IScheduledHandle): void;
  /**
   * Queues `callback` to run at the next microtask checkpoint, delegating to
   * `timeProvider.scheduler.microtasks.queue`.
   *
   * Microtasks are not time-driven, so the clock strategy changes only where the checkpoint
   * falls, never whether it happens: a system clock hands `callback` to the host's own queue,
   * and a deterministic one keeps its own, which it drains at every point standing in for a
   * checkpoint. There is nothing to cancel - a queued microtask always runs, exactly as with
   * the `queueMicrotask` global.
   */
  queueMicrotask(callback: () => void): void;
}
