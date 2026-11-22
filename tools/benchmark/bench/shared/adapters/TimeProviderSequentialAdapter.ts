import { ITimerAdapter } from "./ITimerAdapter.ts";
import type { IDurationSpec } from "@time-provider/core/deterministic";
import * as headKit from "./kit.ts";
import { BASELINE_SUFFIX, type TimeProviderKit } from "../baseline.ts";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";

export class TimeProviderSequentialAdapter implements ITimerAdapter {
  readonly name: string;
  readonly #delays: AdvanceDelayQueue;
  readonly #kit: TimeProviderKit;
  readonly #plannedTimestamps: number[];
  #runtime!: {
    scheduler: {
      timers: {
        once(ms: IDurationSpec, callback: () => void): { dispose(): void };
        every(ms: IDurationSpec, callback: () => void): { dispose(): void };
        readonly pendingCount: number;
      };
      microtasks: {
        queue(callback: () => void): void;
        drain(): void;
      };
      /*
        The idle addon's placeholder `drain()` only fires anything on a manual runtime (it needs
        an on-demand `advance()`, which sequential doesn't have - its future instants are fixed up
        front via withSequentialTime()). So drainIdleCallbacks() below is a documented no-op here
        for now - see DeterministicIdleScheduler.drain.
      */
      idle: {
        request(callback: () => void, options?: { timeout: number }): unknown;
        drain(maxCount?: number): number;
      };
      animation: { scheduleFrame(callback: () => void): { dispose(): void } };
    };
    clock: { utcNow(): unknown; monotonicNow(): unknown; timestampNow(): number };
  };

  /**
   * Sequential mode can only be scripted through the public `withSequentialTime()` builder,
   * before `create()` - there's no supported way to queue a timestamp on an already-created
   * runtime. So every `advance()` this adapter will ever be driven with must be known up
   * front: `delaysMs` (the same deltas every other adapter gets) is folded here into absolute,
   * cumulative timestamps and pre-seeded in setup().
   */
  constructor(delaysMs: readonly number[] = [], baseline?: TimeProviderKit) {
    this.name = `time-provider (sequential)${baseline ? BASELINE_SUFFIX : ""}`;
    this.#kit = baseline ?? headKit;
    this.#delays = new AdvanceDelayQueue(delaysMs);
    let target = 0;
    this.#plannedTimestamps = delaysMs.map((delta) => (target += delta));
  }

  setup(): void {
    this.#delays.reset();
    const { createTimeProvider, plugin, idleAddon, animationFrameAddon } = this.#kit;
    const builder = createTimeProvider
      .for(plugin)
      .use(idleAddon)
      .use(animationFrameAddon)
      .asSequential()
      .withSequentialTime(0);
    for (const timestamp of this.#plannedTimestamps) {
      builder.withSequentialTime(timestamp);
    }
    this.#runtime = builder.create();
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
    this.#delays.next();
    /*
      two reads have to stay adjacent to each other:
      - one to consume the entry registration already peeked
      - one to land on the real target.
    */
    this.#runtime.clock.utcNow();
    this.#runtime.clock.utcNow();
  }
  countTimers(): number {
    return this.#runtime.scheduler.timers.pendingCount;
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
  /*
    No runAll/runToNext/runToLast/advanceTo/jumpWallClock: moveUntil(), moveTo() and moveBy() exist
    only on the manual clock, so those scenarios report "--".
  */
}
