import { describe, expect, test } from "vite-plus/test";
import { asEpoch, toInstant, type ITimerHandle, type ITimers } from "@time-provider/core";
import { EtaScheduler } from "../src/eta-scheduler.ts";
import { EtaTrackBuilder } from "../src/eta-tracker.ts";
import type { IEtaDurationSnapshot } from "../src/types.ts";

function fakeScheduler(): {
  timers: ITimers;
  intervals: { callback: () => void; delay: number | undefined }[];
} {
  const intervals: { callback: () => void; delay: number | undefined }[] = [];
  return {
    intervals,
    timers: {
      once() {
        throw new Error("not used by the eta addon");
      },
      every(millisecondsDelay, callback) {
        intervals.push({ callback, delay: millisecondsDelay });
        return {} as ITimerHandle;
      },
      recurring() {
        throw new Error("not used by the eta addon");
      },
      wait() {
        throw new Error("not used by the eta addon");
      },
    },
  };
}

describe("EtaScheduler", () => {
  test("estimate() returns an EtaTrackBuilder", () => {
    const { timers } = fakeScheduler();
    const sut = new EtaScheduler(timers, () => asEpoch());
    expect(sut.estimate()).toBeInstanceOf(EtaTrackBuilder);
  });

  test("wires the builder to its own scheduler", () => {
    const { timers, intervals } = fakeScheduler();
    const sut = new EtaScheduler(timers, () => asEpoch());
    sut
      .estimate()
      .withEstimatedDuration(1000)
      .start(() => {});
    expect(intervals).toHaveLength(1);
  });

  test("wires the builder to its own (live) timestampNow, read fresh on every estimate()", () => {
    const { timers, intervals } = fakeScheduler();
    let now = 42;
    const sut = new EtaScheduler(timers, () => toInstant({ milliseconds: now }));
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
