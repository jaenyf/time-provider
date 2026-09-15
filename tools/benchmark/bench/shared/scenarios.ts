import type { ITimerAdapter } from "./adapters/ITimerAdapter.ts";
/**
 * Represents a benchmark scenario
 */
export type Scenario = {
  name: string;
  /**
   * The exact, in-order `advance()` deltas this scenario drives every adapter with, if any.
   * Every adapter is constructed with this same list (see e.g. TimeProviderManualAdapter's
   * constructor) and pulls the next value on each `advance()` call - keep its length in sync
   * with the number of `advance()` calls made in `run` below.
   */
  advanceDelaysMs?: number[];
  run: (adapter: ITimerAdapter) => void;
};

const samplesCount = 5000;

export const clockReadScenarios: Scenario[] = [
  {
    name: `read now ${samplesCount} times`,
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.now();
      }
    },
  },
];

const timeoutsAdvanceMs = 1000;
const intervalsAdvanceMs = samplesCount * 10 + 1;

export const schedulingScenarios: Scenario[] = [
  {
    name: `schedule ${samplesCount} timeouts, without time advance`,
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => {}, i);
      }
    },
  },
  {
    name: `schedule ${samplesCount} timeouts, with time advance`,
    advanceDelaysMs: [timeoutsAdvanceMs],
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => {}, i);
      }
      adapter.advance();
    },
  },
  /*
    The two microtask scenarios below share the timeout scenario's shape on purpose: comparing
    them against `schedule N timeouts, with time advance` is what separates the cost of reaching
    a microtask checkpoint from the cost of running one.
  */
  {
    name: `schedule ${samplesCount} timeouts queueing 1 microtask each, with time advance and drain`,
    advanceDelaysMs: [timeoutsAdvanceMs],
    run: (adapter) => {
      const microtask = () => {};
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => adapter.queueMicrotask(microtask), i);
      }
      adapter.advance();
      adapter.drainMicrotasks();
    },
  },
  {
    name: `schedule ${samplesCount} timeouts queueing 10 microtasks each, with time advance and drain`,
    advanceDelaysMs: [timeoutsAdvanceMs],
    run: (adapter) => {
      const microtask = () => {};
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => {
          for (let k = 0; k < 10; k++) adapter.queueMicrotask(microtask);
        }, i);
      }
      adapter.advance();
      adapter.drainMicrotasks();
    },
  },
  {
    name: `schedule ${samplesCount} intervals, without time advance`,
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setInterval(() => {}, (i + 1) * 10);
      }
    },
  },
  {
    name: `schedule ${samplesCount} intervals, with time advance`,
    advanceDelaysMs: [intervalsAdvanceMs],
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setInterval(() => {}, (i + 1) * 10);
      }
      adapter.advance();
    },
  },
  /*
    The two microtask scenarios below share the timeout scenario's shape on purpose: comparing
    them against `schedule N intervals, with time advance` is what separates the cost of reaching
    a microtask checkpoint from the cost of running one.
  */
  {
    name: `schedule ${samplesCount} intervals queueing 1 microtask each, with time advance and drain`,
    advanceDelaysMs: [timeoutsAdvanceMs],
    run: (adapter) => {
      const microtask = () => {};
      for (let i = 0; i < samplesCount; i++) {
        adapter.setInterval(() => adapter.queueMicrotask(microtask), (i + 1) * 10);
      }
      adapter.advance();
      adapter.drainMicrotasks();
    },
  },
  {
    name: `schedule ${samplesCount} intervals queueing 10 microtasks each, with time advance and drain`,
    advanceDelaysMs: [timeoutsAdvanceMs],
    run: (adapter) => {
      const microtask = () => {};
      for (let i = 0; i < samplesCount; i++) {
        adapter.setInterval(
          () => {
            for (let k = 0; k < 10; k++) adapter.queueMicrotask(microtask);
          },
          (i + 1) * 10,
        );
      }
      adapter.advance();
      adapter.drainMicrotasks();
    },
  },
  {
    name: `queue ${samplesCount} microtasks, and drain without time advance`,
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.queueMicrotask(() => {});
      }
      adapter.drainMicrotasks();
    },
  },
  {
    name: `queue ${samplesCount} microtasks, with time advance and drain`,
    advanceDelaysMs: [timeoutsAdvanceMs],
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.queueMicrotask(() => {});
      }
      adapter.advance();
      adapter.drainMicrotasks();
    },
  },
];
