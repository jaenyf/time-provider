import { ITimerAdapter } from "./ITimerAdapter.ts";
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon as idleAddon } from "@time-provider/addon-idle/deterministic";
import { addon as animationFrameAddon } from "@time-provider/addon-animation-frame/deterministic";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";
import { IDurationSpec } from "@time-provider/core";

export class TimeProviderManualAdapter implements ITimerAdapter {
  readonly name = "time-provider (manual)";
  readonly #delays: AdvanceDelayQueue;
  #runtime!: {
    scheduler: {
      timers: {
        once(ms: IDurationSpec, callback: () => void): { dispose(): void };
        every(ms: IDurationSpec, callback: () => void): unknown;
      };
      microtasks: {
        queue(callback: () => void): void;
        drain(): void;
      };
      idle: {
        request(callback: () => void): unknown;
        drain(maxCount?: number): number;
      };
      animation: { scheduleFrame(callback: () => void): unknown };
    };
    clock: {
      utcNow(): unknown;
      monotonicNow(): unknown;
      advance(config: { milliseconds: number }): unknown;
      moveTo(time: "nextTimer" | "lastTimer"): unknown;
      moveUntil(until: "noTimers"): unknown;
    };
  };

  constructor(delaysMs: readonly number[] = []) {
    this.#delays = new AdvanceDelayQueue(delaysMs);
  }

  setup(): void {
    this.#delays.reset();
    this.#runtime = createTimeProvider
      .for(plugin)
      .use(idleAddon)
      .use(animationFrameAddon)
      .asManual()
      // The default limit (1000) would throw before a scenario's 5000 timers have all fired.
      .withMoveUntilTimersLimit(Number.MAX_SAFE_INTEGER)
      .create();
  }
  teardown(): void {
    // Nothing to release - the runtime is just discarded.
  }

  now(): unknown {
    return this.#runtime.clock.utcNow();
  }
  monotonicNow(): unknown {
    return this.#runtime.clock.monotonicNow();
  }
  setTimeout(callback: () => void, delayMs: number): unknown {
    return this.#runtime.scheduler.timers.once({ milliseconds: delayMs }, callback);
  }
  clearTimeout(handle: unknown): void {
    (handle as { dispose(): void }).dispose();
  }
  setInterval(callback: () => void, delayMs: number): void {
    this.#runtime.scheduler.timers.every({ milliseconds: delayMs }, callback);
  }
  drainMicrotasks(): void {
    this.#runtime.scheduler.microtasks.drain();
  }
  queueMicrotask(callback: () => void): void {
    this.#runtime.scheduler.microtasks.queue(callback);
  }
  advance(): void {
    this.#runtime.clock.advance({ milliseconds: this.#delays.next() });
  }
  requestIdleCallback(callback: () => void): void {
    this.#runtime.scheduler.idle.request(callback);
  }
  drainIdleCallbacks(ms: number): void {
    this.#runtime.scheduler.idle.drain(ms);
  }
  requestAnimationFrame(callback: () => void): void {
    this.#runtime.scheduler.animation.scheduleFrame(callback);
  }
  runAll(): void {
    this.#runtime.clock.moveUntil("noTimers");
  }
  runToNext(): void {
    this.#runtime.clock.moveTo("nextTimer");
  }
  runToLast(): void {
    this.#runtime.clock.moveTo("lastTimer");
  }
}
