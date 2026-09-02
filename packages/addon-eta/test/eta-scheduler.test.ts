import { describe, expect, test } from "vite-plus/test";
import {
  asEpochMilliseconds,
  toDuration,
  toInstant,
  type EpochMilliseconds,
  type IDurationSpec,
  type IRuntime,
  type IScheduledHandle,
  type ITimers,
} from "@time-provider/core";
import { EtaScheduler } from "../src/eta-scheduler.ts";
import { EtaTrackBuilder } from "../src/eta-tracker.ts";
import type { IEtaDurationSnapshot } from "../src/types.ts";

function fakeRuntime(timestampNowDelegate: () => EpochMilliseconds): IRuntime<unknown> & {
  timers: ITimers;
  clock: {
    get timestampNow(): EpochMilliseconds;
  };
  intervals: { callback: () => void; delay: number | undefined }[];
} {
  const intervals: { callback: () => void; delay: number | undefined }[] = [];
  return {
    intervals,
    timestampNow: timestampNowDelegate,
    clock: {
      timestampNow: timestampNowDelegate,
    },
    registerAddon: () => {},
    timers: {
      once() {
        throw new Error("not used by the eta addon");
      },
      every(durationSpec: IDurationSpec, callback: () => void) {
        intervals.push({ callback, delay: toDuration(durationSpec) });
        return {} as IScheduledHandle;
      },
      recurring() {
        throw new Error("not used by the eta addon");
      },
      wait() {
        throw new Error("not used by the eta addon");
      },
    },
  } as unknown as IRuntime<unknown> & {
    timers: ITimers;
    clock: {
      get timestampNow(): EpochMilliseconds;
    };
    intervals: { callback: () => void; delay: number | undefined }[];
  };
}

describe("EtaScheduler", () => {
  describe("dispose", () => {
    test("explicit dispose call disposes instance", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaScheduler();
      sut.applyToRuntime(runtime);
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("implicit dispose call disposes instance", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      let sutRef: EtaScheduler<unknown> | undefined = undefined;
      {
        using sut = new EtaScheduler();
        sut.applyToRuntime(runtime);
        sutRef = sut;
      }
      expect(sutRef.isDisposed).toBe(true);
    });
  });

  test("estimate() returns an EtaTrackBuilder", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaScheduler();
    sut.applyToRuntime(runtime);
    expect(sut.estimate()).toBeInstanceOf(EtaTrackBuilder);
  });

  test("wires the builder to its own scheduler", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaScheduler();
    sut.applyToRuntime(runtime);
    sut
      .estimate()
      .withEstimatedDuration(1000)
      .start(() => {});
    expect(runtime.intervals).toHaveLength(1);
  });

  test("wires the builder to its own (live) timestampNow, read fresh on every estimate()", () => {
    const runtime = fakeRuntime(() => toInstant({ milliseconds: now }));
    let now = 42;
    const sut = new EtaScheduler();
    sut.applyToRuntime(runtime);
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

    runtime.intervals[0]!.callback();
    runtime.intervals[1]!.callback();
    expect(first[0]!.startTime).toBe(42);
    expect(second[0]!.startTime).toBe(100);
  });
});
