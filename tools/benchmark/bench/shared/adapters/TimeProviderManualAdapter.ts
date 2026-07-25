import { ITimerAdapter } from "./ITimerAdapter.ts";
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";

export class TimeProviderManualAdapter implements ITimerAdapter {
  readonly name = "time-provider (manual)";
  readonly #delays: AdvanceDelayQueue;
  #runtime!: {
    scheduler: {
      setTimeout(callback: () => void, ms: number): unknown;
      setInterval(callback: () => void, ms: number): unknown;
    };
    clock: { utcNow(): unknown; advance(config: { milliseconds: number }): unknown };
  };

  constructor(delaysMs: readonly number[] = []) {
    this.#delays = new AdvanceDelayQueue(delaysMs);
  }

  setup(): void {
    this.#delays.reset();
    this.#runtime = createTimeProvider.for(plugin).asManual().create();
  }
  teardown(): void {
    // Nothing to release - the runtime is just discarded.
  }

  now(): unknown {
    return this.#runtime.clock.utcNow();
  }
  setTimeout(callback: () => void, delayMs: number): void {
    this.#runtime.scheduler.setTimeout(callback, delayMs);
  }
  setInterval(callback: () => void, delayMs: number): void {
    this.#runtime.scheduler.setInterval(callback, delayMs);
  }
  advance(): void {
    this.#runtime.clock.advance({ milliseconds: this.#delays.next() });
  }
}
