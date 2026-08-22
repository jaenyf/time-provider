import { describe, expect, test } from "vite-plus/test";
import {
  type IScheduledHandle,
  type IRuntime,
  type ITimers,
  toDuration,
  type IAddon,
} from "@time-provider/core";
import { addon } from "../src/index.ts";
import { EtaScheduler } from "../src/eta-scheduler.ts";

type FakeRuntime = IRuntime<unknown> & { eta?: unknown; registerAddon(addon: IAddon): void };

/*
 * applyToRuntime only touches what it's documented to (define `.eta`, read `.clock` and
 * `.scheduler`), so a minimal object satisfies it for a focused unit test without needing a real
 * plugin/runtime.
 */
function fakeSystemRuntime(now: number): {
  runtime: FakeRuntime;
  intervals: { callback: () => void; delay: number | undefined }[];
} {
  const intervals: { callback: () => void; delay: number | undefined }[] = [];
  const timers: ITimers = {
    once() {
      throw new Error("not used by the eta addon");
    },
    every(durationSpec, callback) {
      intervals.push({ callback, delay: toDuration(durationSpec) });
      return {} as IScheduledHandle;
    },
    recurring() {
      throw new Error("not used by the eta addon");
    },
    wait() {
      throw new Error("not used by the eta addon");
    },
  };
  const clock = { timestampNow: () => now };
  return {
    runtime: { timers, clock, registerAddon: (_addon: IAddon) => {} } as unknown as FakeRuntime,
    intervals,
  };
}

describe("etaAddon (system)", () => {
  test("applyToRuntime defines .eta with an EtaScheduler", () => {
    const { runtime } = fakeSystemRuntime(0);
    addon.applyToRuntime(runtime);
    expect(runtime.eta).toBeInstanceOf(EtaScheduler);
  });

  test("applyToRuntime's defined property is enumerable but not writable", () => {
    const { runtime } = fakeSystemRuntime(0);
    addon.applyToRuntime(runtime);
    const descriptor = Object.getOwnPropertyDescriptor(runtime, "eta");
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.writable).toBe(false);
  });

  test("wires .eta to the runtime's own scheduler and clock", () => {
    const { runtime, intervals } = fakeSystemRuntime(1000);
    addon.applyToRuntime(runtime);
    const snapshots: { startTime: number }[] = [];
    (runtime.eta as EtaScheduler)
      .estimate()
      .withEstimatedDuration(5000)
      .start((s) => snapshots.push(s));
    expect(intervals).toHaveLength(1);
    intervals[0]!.callback();
    expect(snapshots[0]!.startTime).toBe(1000);
  });

  describe("clone", () => {
    test("returns a distinct instance", () => {
      expect(addon.clone()).not.toBe(addon);
    });

    test("returns a distinct addon that still applies an EtaScheduler", () => {
      const cloned = addon.clone();
      const { runtime } = fakeSystemRuntime(0);
      cloned.applyToRuntime(runtime);
      expect(runtime.eta).toBeInstanceOf(EtaScheduler);
    });
  });
});
