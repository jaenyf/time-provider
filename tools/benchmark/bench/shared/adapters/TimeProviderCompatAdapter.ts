import { ITimerAdapter } from "./ITimerAdapter.ts";
import * as headKit from "./kit.ts";
import { BASELINE_SUFFIX, type TimeProviderKit } from "../baseline.ts";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";

/** A manual runtime driven through the compat addon's native-shaped functions, like sinon's. */
export class TimeProviderCompatAdapter implements ITimerAdapter {
  readonly name: string;
  readonly #delays: AdvanceDelayQueue;
  readonly #kit: TimeProviderKit;
  #runtime!: {
    compat: {
      performance: { now(): number };
      setTimeout(callback: () => void, delay: number): unknown;
      clearTimeout(handle: unknown): void;
      setInterval(callback: () => void, delay: number): unknown;
      clearInterval(handle: unknown): void;
      queueMicrotask(callback: () => void): void;
    };
    scheduler: { microtasks: { drain(): void } };
    clock: {
      utcNow(): unknown;
      timestampNow(): number;
      advance(config: { milliseconds: number }): unknown;
    };
  };

  constructor(delaysMs: readonly number[] = [], baseline?: TimeProviderKit) {
    this.name = `time-provider (compat)${baseline ? BASELINE_SUFFIX : ""}`;
    this.#delays = new AdvanceDelayQueue(delaysMs);
    this.#kit = baseline ?? headKit;
  }

  setup(): void {
    this.#delays.reset();
    const { createTimeProvider, plugin, compatAddon } = this.#kit;
    this.#runtime = createTimeProvider.for(plugin).use(compatAddon).asManual().create();
  }
  teardown(): void {
    // Nothing to release - the runtime is just discarded.
  }

  now(): unknown {
    return this.#runtime.clock.utcNow();
  }
  monotonicNow(): unknown {
    return this.#runtime.compat.performance.now();
  }
  timestampNow(): number {
    return this.#runtime.clock.timestampNow();
  }
  setTimeout(callback: () => void, delayMs: number): unknown {
    return this.#runtime.compat.setTimeout(callback, delayMs);
  }
  clearTimeout(handle: unknown): void {
    this.#runtime.compat.clearTimeout(handle);
  }
  setInterval(callback: () => void, delayMs: number): unknown {
    return this.#runtime.compat.setInterval(callback, delayMs);
  }
  clearInterval(handle: unknown): void {
    this.#runtime.compat.clearInterval(handle);
  }
  queueMicrotask(callback: () => void): void {
    this.#runtime.compat.queueMicrotask(callback);
  }
  drainMicrotasks(): void {
    this.#runtime.scheduler.microtasks.drain();
  }
  advance(): void {
    this.#runtime.clock.advance({ milliseconds: this.#delays.next() });
  }
  /*
    Clock moves, idle callbacks and animation frames don't go through compat: those scenarios
    report "--" here, the manual adapter covers them.
  */
}
