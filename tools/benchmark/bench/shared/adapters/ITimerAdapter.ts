/**
 * A shared interface that is used to benchmark libraries generically.
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
  setTimeout(callback: () => void, delayMs: number): void;
  setInterval(callback: () => void, delayMs: number): void;
  /** Queues `callback` on whatever microtask queue this adapter's library maintains. */
  queueMicrotask(callback: () => void): void;
  /** Drain whatever microtask queue this adapter's library maintains. */
  drainMicrotasks(): void;
  /** Requests `callback` to run when this adapter's library considers itself idle. */
  requestIdleCallback(callback: () => void): void;
  /**
   * Simulates an idle period of `ms` milliseconds, firing whatever idle callbacks become due.
   * Every adapter models idle callbacks as a delay-gated timeout under the hood today (sinon's
   * own requestIdleCallback works this way natively; time-provider's current placeholder
   * implementation and the jest fallback both do the same) - so this shares `advance()`'s
   * "simulate ms passing" shape rather than a callback-count budget.
   */
  drainIdleCallbacks(ms: number): void;
  /**
   * Advances the fake clock by the next delay from this adapter's pre-planned delay list
   * (see its constructor), synchronously firing whatever becomes due.
   */
  advance(): void;
}
