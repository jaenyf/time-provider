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
  /** Optional adapter members this scenario calls; an adapter missing one is reported as "--". */
  requires?: readonly (keyof ITimerAdapter)[];
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
  {
    name: `read monotonic now ${samplesCount} times`,
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.monotonicNow();
      }
    },
  },
];

const timeoutsAdvanceMs = 1000;
/*
  Scenarios added after the first ones use `i + 1` delays: a deterministic time-provider runtime
  fires a timer due on insert right away, so a 0ms timer would leave it one timer short of the
  others by the time the scenario clears or steps through them.
*/
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
    name: `schedule ${samplesCount} timeouts, and clear them`,
    requires: ["clearTimeout"],
    run: (adapter) => {
      const handles = [];
      for (let i = 0; i < samplesCount; i++) {
        handles.push(adapter.setTimeout(() => {}, i + 1));
      }
      for (const handle of handles) {
        adapter.clearTimeout!(handle);
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
  {
    name: `schedule ${samplesCount} timeouts, with ${samplesCount} time advances of 1ms`,
    advanceDelaysMs: Array.from({ length: samplesCount }, () => 1),
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => {}, i);
      }
      for (let i = 0; i < samplesCount; i++) {
        adapter.advance();
      }
    },
  },
  {
    name: `chain ${samplesCount} timeouts, each scheduling the next, with time advance`,
    advanceDelaysMs: [samplesCount],
    run: (adapter) => {
      let remaining = samplesCount;
      const next = () => {
        if (--remaining > 0) adapter.setTimeout(next, 1);
      };
      adapter.setTimeout(next, 1);
      adapter.advance();
    },
  },
  {
    name: `schedule ${samplesCount} timeouts, and run all`,
    requires: ["runAll"],
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => {}, i + 1);
      }
      adapter.runAll!();
    },
  },
  {
    name: `schedule ${samplesCount} timeouts, and step to each next one`,
    requires: ["runToNext"],
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => {}, i + 1);
      }
      for (let i = 0; i < samplesCount; i++) {
        adapter.runToNext!();
      }
    },
  },
  {
    name: `schedule ${samplesCount} timeouts, and run to the last one`,
    requires: ["runToLast"],
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => {}, i + 1);
      }
      adapter.runToLast!();
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
  /*
    Unlike drainMicrotasks() above, drainIdleCallbacks(ms) isn't independent of time passing for
    any adapter today - every one of them models an idle callback as a delay-gated timeout under
    the hood (see ITimerAdapter.drainIdleCallbacks), so there's no "without time advance" variant
    to compare against the way there is for microtasks.
  */
  {
    name: `request ${samplesCount} idle callbacks, and drain`,
    requires: ["requestIdleCallback", "drainIdleCallbacks"],
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.requestIdleCallback!(() => {});
      }
      adapter.drainIdleCallbacks!(samplesCount);
    },
  },
  {
    // One 60Hz frame is 16.67ms, so a 17ms advance reaches the first frame in every adapter.
    name: `request ${samplesCount} animation frames, with time advance`,
    requires: ["requestAnimationFrame"],
    advanceDelaysMs: [17],
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.requestAnimationFrame!(() => {});
      }
      adapter.advance();
    },
  },
];
