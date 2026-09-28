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
  now(): unknown;
  /** Reads the adapter's current fake monotonic time (`performance.now()` or equivalent). */
  monotonicNow(): unknown;
  /** Returns whatever handle `clearTimeout()` takes. */
  setTimeout(callback: () => void, delayMs: number): unknown;
  setInterval(callback: () => void, delayMs: number): void;
  clearTimeout?(handle: unknown): void;
  /** Queues `callback` on whatever microtask queue this adapter's library maintains. */
  queueMicrotask(callback: () => void): void;
  /** Drain whatever microtask queue this adapter's library maintains. */
  drainMicrotasks(): void;
  /** Requests `callback` to run when this adapter's library considers itself idle. */
  requestIdleCallback?(callback: () => void): void;
  /**
   * Simulates an idle period of `ms` milliseconds, firing whatever idle callbacks become due.
   * Every adapter supporting them models idle callbacks as a delay-gated timeout under the hood
   * today (sinon's own requestIdleCallback works this way natively; time-provider's current
   * placeholder implementation does the same) - so this shares `advance()`'s
   * "simulate ms passing" shape rather than a callback-count budget.
   */
  drainIdleCallbacks?(ms: number): void;
  requestAnimationFrame?(callback: () => void): void;
  /**
   * Advances the fake clock by the next delay from this adapter's pre-planned delay list
   * (see its constructor), synchronously firing whatever becomes due.
   */
  advance(): void;
  /** Fires timers one after another, including ones they schedule, until none is pending. */
  runAll?(): void;
  /** Moves the clock to the next pending timer and fires it. */
  runToNext?(): void;
  /** Moves the clock to the last timer pending now, firing every timer due until then. */
  runToLast?(): void;
}
