import { ITimerAdapter } from "./ITimerAdapter.ts";
import { createTimeProvider, type IDurationSpec } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon as idleAddon } from "@time-provider/addon-idle/deterministic";
import { addon as animationFrameAddon } from "@time-provider/addon-animation-frame/deterministic";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";

export class TimeProviderSequentialAdapter implements ITimerAdapter {
  readonly name = "time-provider (sequential)";
  readonly #delays: AdvanceDelayQueue;
  readonly #plannedTimestamps: number[];
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
      /*
        The idle addon's placeholder `drain()` only fires anything on a manual runtime (it needs
        an on-demand `advance()`, which sequential doesn't have - its future instants are fixed up
        front via withSequentialTime()). So drainIdleCallbacks() below is a documented no-op here
        for now - see DeterministicIdleScheduler.drain.
      */
      idle: {
        request(callback: () => void): unknown;
        drain(maxCount?: number): number;
      };
      animation: { scheduleFrame(callback: () => void): unknown };
    };
    clock: { utcNow(): unknown; monotonicNow(): unknown };
  };

  /**
   * Sequential mode can only be scripted through the public `withSequentialTime()` builder,
   * before `create()` - there's no supported way to queue a timestamp on an already-created
   * runtime. So every `advance()` this adapter will ever be driven with must be known up
   * front: `delaysMs` (the same deltas every other adapter gets) is folded here into absolute,
   * cumulative timestamps and pre-seeded in setup().
   */
  constructor(delaysMs: readonly number[] = []) {
    this.#delays = new AdvanceDelayQueue(delaysMs);
    let target = 0;
    this.#plannedTimestamps = delaysMs.map((delta) => (target += delta));
  }

  setup(): void {
    this.#delays.reset();
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
    this.#delays.next();
    /*
      two reads have to stay adjacent to each other:
      - one to consume the entry registration already peeked
      - one to land on the real target.
    */
    this.#runtime.clock.utcNow();
    this.#runtime.clock.utcNow();
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
  /*
    No runAll/runToNext/runToLast: moveUntil() and moveTo() exist only on the manual clock, so
    those scenarios report "--".
  */
}
