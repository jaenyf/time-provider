import { ITimerAdapter } from "./ITimerAdapter.ts";
import { ModernFakeTimers } from "@jest/fake-timers";

export class JestFakeTimersAdapter implements ITimerAdapter {
  readonly name = "jest fake-timers (modern)";
  #timers = new ModernFakeTimers({
    global: globalThis,
    //@ts-expect-error : Type '{}' is missing the following properties from type 'ProjectConfig': [...]
    config: {},
  });

  setup(): void {
    this.#timers.useFakeTimers();
  }
  teardown(): void {
    this.#timers.useRealTimers();
  }

  now(): unknown {
    //because time-provider always returns a Date object we also return one here in order to have a clean comparison (and not Date vs number comparison)
    return new Date(Date.now());
  }
  setTimeout(callback: () => void, delayMs: number): void {
    globalThis.setTimeout(callback, delayMs);
  }
  setInterval(callback: () => void, delayMs: number): void {
    globalThis.setInterval(callback, delayMs);
  }
  advance(ms: number): void {
    this.#timers.advanceTimersByTime(ms);
  }
}
