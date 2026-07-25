import { ITimerAdapter } from "./ITimerAdapter.ts";
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { AdvanceDelayQueue } from "./AdvanceDelayQueue.ts";

export class TimeProviderSequentialAdapter implements ITimerAdapter {
  readonly name = "time-provider (sequential)";
  readonly #delays: AdvanceDelayQueue;
  readonly #plannedTimestamps: number[];
  #runtime!: {
    scheduler: {
      setTimeout(callback: () => void, ms: number): unknown;
      setInterval(callback: () => void, ms: number): unknown;
    };
    clock: { utcNow(): unknown };
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
    this.#plannedTimestamps.slice;
  }

  setup(): void {
    this.#delays.reset();
    const creator = createTimeProvider.for(plugin).asSequential().withSequentialTime(0);
    for (const timestamp of this.#plannedTimestamps) {
      creator.withSequentialTime(timestamp);
    }
    this.#runtime = creator.create();
  }
  teardown(): void {
    // Nothing to release - the runtime is just discarded.
  }

  now(): unknown {
    return this.#runtime.clock.utcNow();
  }
  setTimeout(callback: () => void, delayMs: number): void {
    this.#runtime.scheduler.setTimeout(callback, delayMs);
  }
  setInterval(callback: () => void, delayMs: number): void {
    this.#runtime.scheduler.setInterval(callback, delayMs);
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
}
