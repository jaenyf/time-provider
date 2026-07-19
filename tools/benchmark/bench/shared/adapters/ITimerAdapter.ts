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
  /** Advances the fake clock by `ms`, synchronously firing whatever becomes due. */
  advance(ms: number): void;
}
