import { ITimerAdapter } from "./ITimerAdapter.ts";
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";
import { IDurationSpec } from "@time-provider/core";

export class TimeProviderManualAdapter implements ITimerAdapter {
  readonly name = "time-provider (manual)";
  readonly #delays: AdvanceDelayQueue;
  #runtime!: {
    timers: {
      once(ms: IDurationSpec, callback: () => void): unknown;
      every(ms: IDurationSpec, callback: () => void): unknown;
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
    this.#runtime.timers.once({ milliseconds: delayMs }, callback);
  }
  setInterval(callback: () => void, delayMs: number): void {
    this.#runtime.timers.every({ milliseconds: delayMs }, callback);
  }
  advance(): void {
    this.#runtime.clock.advance({ milliseconds: this.#delays.next() });
  }
}
