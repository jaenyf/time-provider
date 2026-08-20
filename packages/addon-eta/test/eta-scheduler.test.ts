import { describe, expect, test } from "vite-plus/test";
import {
  asEpochMilliseconds,
  toDuration,
  toInstant,
  type ITimerHandle,
  type ITimers,
} from "@time-provider/core";
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
      every(durationSpec, callback) {
        intervals.push({ callback, delay: toDuration(durationSpec) });
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
  describe("dispose", () => {
    test("explicit dispose call disposes instance", () => {
      const { timers } = fakeScheduler();
      const sut = new EtaScheduler(timers, () => asEpochMilliseconds());
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("implicit dispose call disposes instance", () => {
      const { timers } = fakeScheduler();
      let sutRef: EtaScheduler | undefined = undefined;
      {
        using sut = new EtaScheduler(timers, () => asEpochMilliseconds());
        sutRef = sut;
      }
      expect(sutRef.isDisposed).toBe(true);
    });
  });

  test("estimate() returns an EtaTrackBuilder", () => {
    const { timers } = fakeScheduler();
    const sut = new EtaScheduler(timers, () => asEpochMilliseconds());
    expect(sut.estimate()).toBeInstanceOf(EtaTrackBuilder);
  });

  test("wires the builder to its own scheduler", () => {
    const { timers, intervals } = fakeScheduler();
    const sut = new EtaScheduler(timers, () => asEpochMilliseconds());
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
