import { ITimerAdapter } from "./ITimerAdapter.ts";
import FakeTimers from "@sinonjs/fake-timers";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";

export class SinonFakeTimersAdapter implements ITimerAdapter {
  readonly name = "sinon fake-timers";
  readonly #delays: AdvanceDelayQueue;
  #clock: ReturnType<typeof FakeTimers.install> | undefined;

  constructor(delaysMs: readonly number[] = []) {
    this.#delays = new AdvanceDelayQueue(delaysMs);
  }

  setup(): void {
    this.#delays.reset();
    this.#clock = FakeTimers.install({ loopLimit: 5000 });
  }
  teardown(): void {
    this.#clock?.uninstall();
    this.#clock = undefined;
  }

  now(): unknown {
    //because time-provider always returns a Date object we also return one here in order to have a clean comparison (and not Date vs number comparison)
    return new Date(this.#clock!.Date.now());
  }
  setTimeout(callback: () => void, delayMs: number): void {
    this.#clock!.setTimeout(callback, delayMs);
  }
  setInterval(callback: () => void, delayMs: number): void {
    this.#clock!.setInterval(callback, delayMs);
  }
  drainMicrotasks(): void {
    this.#clock!.runMicrotasks();
  }
  queueMicrotask(callback: () => void): void {
    this.#clock!.queueMicrotask(callback);
  }
  advance(): void {
    this.#clock!.tick(this.#delays.next());
  }
}
