import { describe, expect, test } from "vite-plus/test";
import type { DueHandle, IRuntime, IScheduler } from "@time-provider/core";
import { addon } from "../src/deterministic.ts";
import { EtaScheduler } from "../src/eta-scheduler.ts";

type FakeRuntime = IRuntime<unknown> & { eta?: unknown };

/*
 * applyToRuntime only touches what it's documented to (define `.eta`, read `.clock` and
 * `.scheduler`), so a minimal object satisfies it for a focused unit test without needing a real
 * deterministic runtime.
 */
function fakeDeterministicRuntime(now: number): {
  runtime: FakeRuntime;
  intervals: { callback: () => void; delay: number | undefined }[];
} {
  const intervals: { callback: () => void; delay: number | undefined }[] = [];
  const scheduler: IScheduler = {
    setTimeout() {
      throw new Error("not used by the eta addon");
    },
    clearTimeout() {
      throw new Error("not used by the eta addon");
    },
    setInterval(callback, millisecondsDelay) {
      intervals.push({ callback, delay: millisecondsDelay });
      return {} as DueHandle;
    },
    clearInterval() {},
    setRecurring() {
      throw new Error("not used by the eta addon");
    },
    clearRecurring() {
      throw new Error("not used by the eta addon");
    },
  };
  const clock = { timestampNow: () => now };
  return {
    runtime: { scheduler, clock } as unknown as FakeRuntime,
    intervals,
  };
}

describe("etaAddon (deterministic)", () => {
  test("applyToRuntime defines .eta with an EtaScheduler", () => {
    const { runtime } = fakeDeterministicRuntime(0);
    addon.applyToRuntime(runtime);
    expect(runtime.eta).toBeInstanceOf(EtaScheduler);
  });

  test("applyToRuntime's defined property is enumerable but not writable", () => {
    const { runtime } = fakeDeterministicRuntime(0);
    addon.applyToRuntime(runtime);
    const descriptor = Object.getOwnPropertyDescriptor(runtime, "eta");
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.writable).toBe(false);
  });

  test("wires .eta to the runtime's own scheduler and clock", () => {
    const { runtime, intervals } = fakeDeterministicRuntime(2000);
    addon.applyToRuntime(runtime);
    const snapshots: { startTime: number }[] = [];
    (runtime.eta as EtaScheduler)
      .estimate()
      .withEstimatedDuration(5000)
      .start((s) => snapshots.push(s));
    expect(intervals).toHaveLength(1);
    intervals[0]!.callback();
    expect(snapshots[0]!.startTime).toBe(2000);
  });

  describe("clone", () => {
    test("returns a distinct instance", () => {
      expect(addon.clone()).not.toBe(addon);
    });

    test("returns a distinct addon that still applies an EtaScheduler", () => {
      const cloned = addon.clone();
      const { runtime } = fakeDeterministicRuntime(0);
      cloned.applyToRuntime(runtime);
      expect(runtime.eta).toBeInstanceOf(EtaScheduler);
    });
  });
});
