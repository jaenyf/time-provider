/**
 * A shared interface that is used to benchmark libraries generically.
 * Optional members are left out by an adapter whose library doesn't support them; scenarios needing
 * one list it in `Scenario.requires`, and the adapter is reported as "--" instead of being timed.
 */
export interface ITimerAdapter {
  //#region benchmark setup
  /** The name of the adapter. */
  readonly name: string;
  /** Prepares a fresh, isolated timer environment for one benchmark iteration. */
  setup(): void;
  /** Tears down whatever setup() installed - always called, even if the iteration throws. */
  teardown(): void;
  //#endregion

  /** Reads the adapter's current fake "now". */
  now?(): unknown;
  /** Reads the adapter's current fake monotonic time (`performance.now()` or equivalent). */
  monotonicNow(): unknown;
  /** Reads the adapter's current fake "now" as epoch milliseconds (`Date.now()` or equivalent). */
  timestampNow?(): number;
  /** Returns whatever handle `clearTimeout()` takes. */
  setTimeout(callback: () => void, delayMs: number): unknown;
  /** Returns whatever handle `clearInterval()` takes. */
  setInterval(callback: () => void, delayMs: number): unknown;
  clearTimeout?(handle: unknown): void;
  clearInterval?(handle: unknown): void;
  /** Queues `callback` on whatever microtask queue this adapter's library maintains. */
  queueMicrotask(callback: () => void): void;
  /** Drain whatever microtask queue this adapter's library maintains. */
  drainMicrotasks(): void;
  /** Number of pending timers. */
  countTimers?(): number;
  /** Requests `callback` to run when idle, or after `timeoutMs` at the latest, returning its handle. */
  requestIdleCallback?(callback: () => void, timeoutMs?: number): unknown;
  cancelIdleCallback?(handle: unknown): void;
  /**
   * Simulates an idle period of `ms` milliseconds, firing whatever idle callbacks become due.
   * Every adapter supporting them models idle callbacks as a delay-gated timeout under the hood
   * today (sinon's own requestIdleCallback works this way natively; time-provider's current
   * placeholder implementation does the same) - so this shares `advance()`'s
   * "simulate ms passing" shape rather than a callback-count budget.
   */
  drainIdleCallbacks?(ms: number): void;
  /** Returns whatever handle `cancelAnimationFrame()` takes. */
  requestAnimationFrame?(callback: () => void): unknown;
  cancelAnimationFrame?(handle: unknown): void;
  /**
   * Advances the fake clock by the next delay from this adapter's pre-planned delay list
   * (see its constructor), synchronously firing whatever becomes due.
   */
  advance(): void;
  /** Moves the clock to `timestamp`, firing whatever becomes due. */
  advanceTo?(timestamp: number): void;
  /** Moves the wall clock by `ms` without firing timers (`setSystemTime()` or equivalent). */
  jumpWallClock?(ms: number): void;
  /** Moves the clock by `ms`, firing each overdue timer once (`as: "sleep"`). */
  sleep?(ms: number): void;
  /** Moves the clock until no timer is pending, firing each overdue timer once. */
  sleepUntilNoTimers?(): void;
  /** Schedules a timeout cancelled when `signal` aborts. */
  setTimeoutWithSignal?(callback: () => void, delayMs: number, signal: AbortSignal): void;
  /** Calls `callback` after `initialDelayMs`, then after each delay it returns, until `false`. */
  recurring?(callback: () => number | false, initialDelayMs: number): void;
  /** Schedules `callback` from a 5-field cron expression. */
  cron?(expression: string, callback: () => void): void;
  /** Converts an ISO string to a UTC date. */
  convertToUtc?(time: string): unknown;
  /** Records a named instant. */
  mark?(name: string): void;
  /** Records the timespan between two marks. */
  measure?(name: string, startMark: string, endMark: string): void;
  /** Reads the recorded marks and measures. */
  timingEntries?(): unknown;
  /** Fires timers one after another, including ones they schedule, until none is pending. */
  runAll?(): void;
  /** Moves the clock to the next pending timer and fires it. */
  runToNext?(): void;
  /** Moves the clock to the last timer pending now, firing every timer due until then. */
  runToLast?(): void;
  /** Creates a fake clock of its own and releases it. */
  createAndDispose?(): void;
}
