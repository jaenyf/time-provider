import type { ITimerAdapter } from "./ITimerAdapter.ts";
import * as headKit from "./kit.ts";
import { BASELINE_SUFFIX, type TimeProviderKit } from "../baseline.ts";

/** A fixed runtime, whose clock never moves: it only serves the clock-read scenarios. */
export class TimeProviderFixedAdapter implements ITimerAdapter {
  readonly name: string;
  readonly #kit: TimeProviderKit;
  #runtime!: {
    dispose(): void;
    scheduler: {
      timers: {
        once(ms: { milliseconds: number }, callback: () => void): unknown;
        every(ms: { milliseconds: number }, callback: () => void): unknown;
      };
      microtasks: { queue(callback: () => void): void; drain(): void };
    };
    clock: {
      utcNow(): unknown;
      monotonicNow(): unknown;
      timestampNow(): number;
    };
    converter: { convertToUtc(time: string): unknown };
    timings: {
      mark(name: string): unknown;
      measure(name: string, options: { start: string; end: string }): unknown;
      entries(): unknown;
    };
  };

  constructor(baseline?: TimeProviderKit) {
    this.name = `time-provider (fixed)${baseline ? BASELINE_SUFFIX : ""}`;
    this.#kit = { ...(baseline ?? headKit) };
  }

  setup(): void {
    const { createTimeProvider, plugin } = this.#kit;
    this.#runtime = createTimeProvider.for(plugin).asFixed().create();
  }
  teardown(): void {
    this.#runtime.dispose();
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
  // Timers are accepted but never fire, since the clock never moves.
  setTimeout(callback: () => void, delayMs: number): unknown {
    return this.#runtime.scheduler.timers.once({ milliseconds: delayMs }, callback);
  }
  setInterval(callback: () => void, delayMs: number): unknown {
    return this.#runtime.scheduler.timers.every({ milliseconds: delayMs }, callback);
  }
  queueMicrotask(callback: () => void): void {
    this.#runtime.scheduler.microtasks.queue(callback);
  }
  drainMicrotasks(): void {
    this.#runtime.scheduler.microtasks.drain();
  }
  advance(): void {
    throw new Error("A fixed clock never moves.");
  }
}
