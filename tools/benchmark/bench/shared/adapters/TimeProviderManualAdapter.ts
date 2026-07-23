import { ITimerAdapter } from "./ITimerAdapter.ts";
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

export class TimeProviderManualAdapter implements ITimerAdapter {
  readonly name = "time-provider (manual)";
  #runtime!: {
    scheduler: {
      setTimeout(callback: () => void, ms: number): unknown;
      setInterval(callback: () => void, ms: number): unknown;
    };
    clock: { utcNow(): unknown; advance(config: { milliseconds: number }): unknown };
  };

  setup(): void {
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
  advance(ms: number): void {
    this.#runtime.clock.advance({ milliseconds: ms });
  }
}
