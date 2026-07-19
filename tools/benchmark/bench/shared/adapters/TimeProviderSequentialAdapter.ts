import { ITimerAdapter } from "./ITimerAdapter.ts";
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

export class TimeProviderSequentialAdapter implements ITimerAdapter {
  readonly name = "time-provider (sequential)";
  #runtime!: {
    scheduler: {
      setTimeout(callback: () => void, ms: number): unknown;
      setInterval(callback: () => void, ms: number): unknown;
    };
    clock: { utcNow(): unknown };
  };

  setup(): void {
    this.#runtime = createTimeProvider
      .for(plugin)
      .asSequential()
      .withSequentialTime(0)
      .withSequentialTime(1000)
      .create();
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
  advance(_ms: number): void {
    this.#runtime.clock.utcNow();
    this.#runtime.clock.utcNow();
  }
}
