import { ITimerAdapter } from "./ITimerAdapter.ts";
import FakeTimers from "@sinonjs/fake-timers";

export class SinonFakeTimersAdapter implements ITimerAdapter {
  readonly name = "sinon fake-timers";
  #clock: ReturnType<typeof FakeTimers.install> | undefined;

  setup(): void {
    this.#clock = FakeTimers.install();
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
  advance(ms: number): void {
    this.#clock!.tick(ms);
  }
}
