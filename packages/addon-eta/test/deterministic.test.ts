import { describe, expect, test } from "vite-plus/test";
import {
  type IScheduledHandle,
  type IRuntime,
  type ITimers,
  toDuration,
  type IAddon,
} from "@time-provider/core";
import { addon as addonBuilderFactory } from "../src/deterministic.ts";
import { EtaScheduler } from "../src/eta-scheduler.ts";

const addon = addonBuilderFactory().create();

type FakeRuntime = IRuntime<unknown> & {
  eta?: unknown;
  registerAddon(addon: IAddon<unknown>): void;
};

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
    runtime: {
      timers,
      clock,
      timestampNow: () => now,
      registerAddon: (_addon: IAddon<unknown>) => {},
    } as unknown as FakeRuntime,
    intervals,
  };
}

describe("etaAddon (deterministic)", () => {
  test("applyToRuntime defines .eta with an estimate() facade", () => {
    const { runtime } = fakeDeterministicRuntime(0);
    addon.applyToRuntime(runtime);
    expect(runtime.eta).toStrictEqual({ estimate: expect.any(Function) });
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
    (runtime.eta as EtaScheduler<unknown>)
      .estimate()
      .withEstimatedDuration(5000)
      .start((s) => snapshots.push(s));
    expect(intervals).toHaveLength(1);
    intervals[0]!.callback();
    expect(snapshots[0]!.startTime).toBe(2000);
  });

  test("addon() returns an independent builder each call", () => {
    const first = addonBuilderFactory().create();
    const second = addonBuilderFactory().create();
    expect(first).not.toBe(second);
    const { runtime } = fakeDeterministicRuntime(0);
    second.applyToRuntime(runtime);
    expect(runtime.eta).toStrictEqual({ estimate: expect.any(Function) });
  });
});
