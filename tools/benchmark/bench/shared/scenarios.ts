import type { ITimerAdapter } from "./adapters/ITimerAdapter.ts";
/**
 * Represents a benchmark scenario
 */
export type Scenario = {
  name: string;
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
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setTimeout(() => {}, i);
      }
      adapter.advance(1000);
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
    run: (adapter) => {
      for (let i = 0; i < samplesCount; i++) {
        adapter.setInterval(() => {}, (i + 1) * 10);
      }
      adapter.advance(samplesCount * 10 + 1);
    },
  },
];
