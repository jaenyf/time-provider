import { ITimerAdapter } from "./ITimerAdapter.ts";
import { ModernFakeTimers } from "@jest/fake-timers";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";

export class JestFakeTimersAdapter implements ITimerAdapter {
  readonly name = "jest fake-timers (modern)";
  readonly #delays: AdvanceDelayQueue;
  #timers!: ModernFakeTimers;

  constructor(delaysMs: readonly number[] = []) {
    this.#delays = new AdvanceDelayQueue(delaysMs);
  }

  setup(): void {
    this.#delays.reset();
    /*
      jest only fakes the APIs the global has when its fake timers are created. Node has no
      requestAnimationFrame, but jest's jsdom environment (pretendToBeVisual) does, so placeholders
      stand in for it here and jest replaces them with its fakes.
    */
    Object.assign(globalThis, { requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} });
    this.#timers = new ModernFakeTimers({
      global: globalThis,
      //@ts-expect-error : Type '{}' is missing the following properties from type 'ProjectConfig': [...]
      config: {},
    });
    this.#timers.useFakeTimers();
  }
  teardown(): void {
    this.#timers.useRealTimers();
    // @ts-expect-error : Node's globalThis types don't declare them as optional
    delete globalThis.requestAnimationFrame;
    // @ts-expect-error : Node's globalThis types don't declare them as optional
    delete globalThis.cancelAnimationFrame;
  }

  now(): unknown {
    //because time-provider always returns a Date object we also return one here in order to have a clean comparison (and not Date vs number comparison)
    return new Date(Date.now());
  }
  monotonicNow(): unknown {
    return performance.now();
  }
  setTimeout(callback: () => void, delayMs: number): unknown {
    return globalThis.setTimeout(callback, delayMs);
  }
  clearTimeout(handle: unknown): void {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>);
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
  runAll(): void {
    this.#timers.runAllTimers();
  }
  runToNext(): void {
    this.#timers.advanceTimersToNextTimer();
  }
  // jest has no runToLast(); runOnlyPendingTimers() fires the timers pending now, which is the same
  // set here since the scenario's callbacks schedule nothing.
  runToLast(): void {
    this.#timers.runOnlyPendingTimers();
  }
  requestAnimationFrame(callback: () => void): void {
    globalThis.requestAnimationFrame(callback);
  }
  /*
    No requestIdleCallback: jsdom doesn't implement it either, so jest never fakes it and that
    scenario reports "--".
  */
}
