import { ITimerAdapter } from "./ITimerAdapter.ts";
import * as headKit from "./kit.ts";
import { BASELINE_SUFFIX, type TimeProviderKit } from "../baseline.ts";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";
import type { EpochMilliseconds, IDurationSpec } from "@time-provider/core";

export class TimeProviderManualAdapter implements ITimerAdapter {
  readonly name: string;
  readonly #delays: AdvanceDelayQueue;
  readonly #kit: TimeProviderKit;
  #runtime!: {
    scheduler: {
      timers: {
        once(ms: IDurationSpec, callback: () => void): { dispose(): void };
        every(ms: IDurationSpec, callback: () => void): { dispose(): void };
        once(
          ms: IDurationSpec,
          callback: () => void,
          options: { signal: AbortSignal },
        ): { dispose(): void };
        recurring(callback: () => IDurationSpec | false, initialDelay: IDurationSpec): unknown;
        readonly pendingCount: number;
      };
      microtasks: {
        queue(callback: () => void): void;
        drain(): void;
      };
      idle: {
        request(callback: () => void, options?: { timeout: number }): unknown;
        drain(maxCount?: number): number;
      };
      cron: { schedule(expression: string, callback: () => void): unknown };
      animation: { scheduleFrame(callback: () => void): { dispose(): void } };
    };
    clock: {
      utcNow(): unknown;
      monotonicNow(): unknown;
      timestampNow(): number;
      advance(config: { milliseconds: number }): unknown;
      moveBy(spec: { milliseconds: number }, options: { as: "snap" | "sleep" }): unknown;
      moveTo(time: "nextTimer" | "lastTimer" | EpochMilliseconds): unknown;
      moveUntil(until: "noTimers", options?: { as: "sleep" }): unknown;
    };
    converter: { convertToUtc(time: string): unknown };
    timings: {
      mark(name: string): unknown;
      measure(name: string, options: { start: string; end: string }): unknown;
      entries(): unknown;
    };
  };

  constructor(delaysMs: readonly number[] = [], baseline?: TimeProviderKit) {
    this.name = `time-provider (manual)${baseline ? BASELINE_SUFFIX : ""}`;
    this.#delays = new AdvanceDelayQueue(delaysMs);
    this.#kit = baseline ?? headKit;
  }

  setup(): void {
    this.#delays.reset();
    const { createTimeProvider, plugin, idleAddon, animationFrameAddon, cronAddon } = this.#kit;
    this.#runtime = createTimeProvider
      .for(plugin)
      .use(idleAddon)
      .use(animationFrameAddon)
      .use(cronAddon)
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
  timestampNow(): number {
    return this.#runtime.clock.timestampNow();
  }
  setTimeout(callback: () => void, delayMs: number): unknown {
    return this.#runtime.scheduler.timers.once({ milliseconds: delayMs }, callback);
  }
  clearTimeout(handle: unknown): void {
    (handle as { dispose(): void }).dispose();
  }
  setInterval(callback: () => void, delayMs: number): unknown {
    return this.#runtime.scheduler.timers.every({ milliseconds: delayMs }, callback);
  }
  clearInterval(handle: unknown): void {
    (handle as { dispose(): void }).dispose();
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
  advanceTo(timestamp: number): void {
    this.#runtime.clock.moveTo(timestamp as EpochMilliseconds);
  }
  jumpWallClock(ms: number): void {
    this.#runtime.clock.moveBy({ milliseconds: ms }, { as: "snap" });
  }
  countTimers(): number {
    return this.#runtime.scheduler.timers.pendingCount;
  }
  setTimeoutWithSignal(callback: () => void, delayMs: number, signal: AbortSignal): void {
    this.#runtime.scheduler.timers.once({ milliseconds: delayMs }, callback, { signal });
  }
  recurring(callback: () => number | false, initialDelayMs: number): void {
    this.#runtime.scheduler.timers.recurring(
      () => {
        const delayMs = callback();
        return delayMs === false ? false : { milliseconds: delayMs };
      },
      { milliseconds: initialDelayMs },
    );
  }
  cron(expression: string, callback: () => void): void {
    this.#runtime.scheduler.cron.schedule(expression, callback);
  }
  requestIdleCallback(callback: () => void, timeoutMs?: number): unknown {
    const options = timeoutMs === undefined ? undefined : { timeout: timeoutMs };
    return this.#runtime.scheduler.idle.request(callback, options);
  }
  cancelIdleCallback(handle: unknown): void {
    (handle as { dispose(): void }).dispose();
  }
  drainIdleCallbacks(ms: number): void {
    this.#runtime.scheduler.idle.drain(ms);
  }
  requestAnimationFrame(callback: () => void): unknown {
    return this.#runtime.scheduler.animation.scheduleFrame(callback);
  }
  cancelAnimationFrame(handle: unknown): void {
    (handle as { dispose(): void }).dispose();
  }
  sleep(ms: number): void {
    this.#runtime.clock.moveBy({ milliseconds: ms }, { as: "sleep" });
  }
  sleepUntilNoTimers(): void {
    this.#runtime.clock.moveUntil("noTimers", { as: "sleep" });
  }
  convertToUtc(time: string): unknown {
    return this.#runtime.converter.convertToUtc(time);
  }
  mark(name: string): void {
    this.#runtime.timings.mark(name);
  }
  measure(name: string, startMark: string, endMark: string): void {
    this.#runtime.timings.measure(name, { start: startMark, end: endMark });
  }
  timingEntries(): unknown {
    return this.#runtime.timings.entries();
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
