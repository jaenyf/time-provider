import { ITimerAdapter } from "./ITimerAdapter.ts";
import { ModernFakeTimers } from "@jest/fake-timers";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";

export class JestFakeTimersAdapter implements ITimerAdapter {
  readonly name = "jest fake-timers (modern)";
  readonly #delays: AdvanceDelayQueue;
  #timers = new ModernFakeTimers({
    global: globalThis,
    //@ts-expect-error : Type '{}' is missing the following properties from type 'ProjectConfig': [...]
    config: {},
  });

  constructor(delaysMs: readonly number[] = []) {
    this.#delays = new AdvanceDelayQueue(delaysMs);
  }

  setup(): void {
    this.#delays.reset();
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
  drainMicrotasks(): void {
    //jest doesn't expose a dedicated method for this (such as runMicrotasks()).
    //runAllTicks() is the closest we can have.
    this.#timers.runAllTicks();
  }
  queueMicrotask(callback: () => void): void {
    globalThis.queueMicrotask(callback);
  }
  advance(): void {
    this.#timers.advanceTimersByTime(this.#delays.next());
  }
}
