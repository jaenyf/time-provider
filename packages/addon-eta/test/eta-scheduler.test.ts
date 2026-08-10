import { describe, expect, test } from "vite-plus/test";
import type { DueHandle, IScheduler } from "@time-provider/core";
import { EtaScheduler } from "../src/eta-scheduler.ts";
import { EtaTrackBuilder } from "../src/eta-tracker.ts";
import type { IEtaDurationSnapshot } from "../src/types.ts";

function fakeScheduler(): {
  scheduler: IScheduler;
  intervals: { callback: () => void; delay: number | undefined }[];
} {
  const intervals: { callback: () => void; delay: number | undefined }[] = [];
  return {
    intervals,
    scheduler: {
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
      queueMicrotask() {
        throw new Error("not used by the eta addon");
      },
    },
  };
}

describe("EtaScheduler", () => {
  test("estimate() returns an EtaTrackBuilder", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaScheduler(scheduler, () => 0);
    expect(sut.estimate()).toBeInstanceOf(EtaTrackBuilder);
  });

  test("wires the builder to its own scheduler", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaScheduler(scheduler, () => 0);
    sut
      .estimate()
      .withEstimatedDuration(1000)
      .start(() => {});
    expect(intervals).toHaveLength(1);
  });

  test("wires the builder to its own (live) timestampNow, read fresh on every estimate()", () => {
    const { scheduler, intervals } = fakeScheduler();
    let now = 42;
    const sut = new EtaScheduler(scheduler, () => now);
    const first: IEtaDurationSnapshot[] = [];
    sut
      .estimate()
      .withEstimatedDuration(0)
      .start((s) => first.push(s));

    now = 100;
    const second: IEtaDurationSnapshot[] = [];
    sut
      .estimate()
      .withEstimatedDuration(0)
      .start((s) => second.push(s));

    intervals[0]!.callback();
    intervals[1]!.callback();
    expect(first[0]!.startTime).toBe(42);
    expect(second[0]!.startTime).toBe(100);
  });
});
