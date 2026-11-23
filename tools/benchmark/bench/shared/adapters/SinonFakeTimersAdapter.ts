import { ITimerAdapter } from "./ITimerAdapter.ts";
import FakeTimers from "@sinonjs/fake-timers";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";
import * as mimic from "./mimic.ts";

// Read once: the bench module runner turns every imported-name use into a counted getter call.
const { recurringTimeout, timeoutWithSignal } = mimic;

export class SinonFakeTimersAdapter implements ITimerAdapter {
  readonly name = "sinon fake-timers";
  readonly #delays: AdvanceDelayQueue;
  #clock: ReturnType<typeof FakeTimers.install> | undefined;

  constructor(delaysMs: readonly number[] = []) {
    this.#delays = new AdvanceDelayQueue(delaysMs);
  }

  setup(): void {
    this.#delays.reset();
    // runAll() throws once it has fired `loopLimit` timers, even if that was the last one.
    this.#clock = FakeTimers.install({ loopLimit: 10_000 });
  }
  teardown(): void {
    this.#clock?.uninstall();
    this.#clock = undefined;
  }
  createAndDispose(): void {
    // sinon's non-global clock needs no release.
    FakeTimers.createClock();
  }

  now(): unknown {
    //because time-provider always returns a Date object we also return one here in order to have a clean comparison (and not Date vs number comparison)
    return new Date(this.#clock!.Date.now());
  }
  monotonicNow(): unknown {
    return this.#clock!.performance.now();
  }
  timestampNow(): number {
    return this.#clock!.Date.now();
  }
  setTimeout(callback: () => void, delayMs: number): unknown {
    return this.#clock!.setTimeout(callback, delayMs);
  }
  clearTimeout(handle: unknown): void {
    this.#clock!.clearTimeout(handle as FakeTimers.TimerId);
  }
  setInterval(callback: () => void, delayMs: number): unknown {
    return this.#clock!.setInterval(callback, delayMs);
  }
  clearInterval(handle: unknown): void {
    this.#clock!.clearInterval(handle as FakeTimers.TimerId);
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
  advanceTo(timestamp: number): void {
    this.#clock!.tick(timestamp - this.#clock!.now);
  }
  jumpWallClock(ms: number): void {
    this.#clock!.setSystemTime(this.#clock!.now + ms);
  }
  countTimers(): number {
    return this.#clock!.countTimers();
  }
  requestIdleCallback(callback: () => void, timeoutMs?: number): unknown {
    const options = timeoutMs === undefined ? undefined : { timeout: timeoutMs };
    return this.#clock!.requestIdleCallback(callback, options);
  }
  cancelIdleCallback(handle: unknown): void {
    this.#clock!.cancelIdleCallback(handle as FakeTimers.TimerId);
  }
  drainIdleCallbacks(ms: number): void {
    this.#clock!.tick(ms);
  }
  requestAnimationFrame(callback: () => void): unknown {
    return this.#clock!.requestAnimationFrame(callback);
  }
  cancelAnimationFrame(handle: unknown): void {
    this.#clock!.cancelAnimationFrame(handle as FakeTimers.TimerId);
  }
  setTimeoutWithSignal(callback: () => void, delayMs: number, signal: AbortSignal): void {
    timeoutWithSignal(this, callback, delayMs, signal);
  }
  recurring(callback: () => number | false, initialDelayMs: number): void {
    recurringTimeout(this, callback, initialDelayMs);
  }
  runAll(): void {
    this.#clock!.runAll();
  }
  runToNext(): void {
    this.#clock!.next();
  }
  runToLast(): void {
    this.#clock!.runToLast();
  }
}
