import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  toInstant,
  type IScheduledHandle,
  type EpochMilliseconds,
  type DurationMilliseconds,
  asEpochMilliseconds,
  asapMilliseconds,
  type IRuntime,
  type IDurationSpec,
} from "@time-provider/core";
import { EtaTrackBuilder } from "../src/eta-tracker.ts";
import type {
  IEtaDurationSnapshot,
  IEtaProgressSnapshot,
  IStagedEtaProgressSnapshot,
  IProgressEtaTracker,
} from "../src/types.ts";

/*
 * Every tracker in this addon only ever touches ITimers.every, so a
 * minimal fake capturing those calls is enough - no real runtime needed.
 */
function fakeRuntime(timestampNowDelegate: () => EpochMilliseconds): IRuntime<unknown> & {
  intervals: { callback: () => void; delay: number | undefined; handle: IScheduledHandle }[];
  cleared: IScheduledHandle[];
  clock: {
    timestampNow: EpochMilliseconds;
  };
} {
  const intervals: { callback: () => void; delay: number | undefined; handle: IScheduledHandle }[] =
    [];
  const cleared: IScheduledHandle[] = [];
  let issued = 0;
  return {
    intervals,
    cleared,
    timestampNow: timestampNowDelegate,
    clock: {
      timestampNow: timestampNowDelegate,
    },
    timers: {
      once() {
        throw new Error("not used by the eta addon");
      },
      every(durationSpec: IDurationSpec, callback: () => void) {
        const handle = {
          kind: 1,
          id: issued++,
          isDisposed: false,
          dispose: () => {
            cleared.push(handle);
          },
          [Symbol.dispose](): void {},
          signal: new AbortController().signal,
        } as IScheduledHandle;
        intervals.push({ callback, delay: toDuration(durationSpec), handle });
        return handle;
      },
      recurring() {
        throw new Error("not used by the eta addon");
      },
      wait() {
        throw new Error("not used by the eta addon");
      },
    },
  } as unknown as IRuntime<unknown> & {
    intervals: { callback: () => void; delay: number | undefined; handle: IScheduledHandle }[];
    cleared: IScheduledHandle[];
    clock: {
      timestampNow: EpochMilliseconds;
    };
  };
}

describe("EtaTrackBuilder.withKnownTotal", () => {
  test("rejects a negative total", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    expect(() => sut.withKnownTotal(-1)).toThrow(/Invalid ETA configuration/);
  });

  test("accepts a zero total", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    expect(() => sut.withKnownTotal(0)).not.toThrow();
  });

  test("arms a single-stage schedule", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    sut.withKnownTotal(100).start(() => {});
    expect(runtime.intervals).toHaveLength(1);
  });
});

describe("EtaTrackBuilder.withStages", () => {
  test("rejects an empty stage list", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    expect(() => sut.withStages([])).toThrow(/Invalid ETA configuration/);
  });

  test("rejects a negative stage weight", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    expect(() =>
      sut.withStages([
        { weight: -1, total: 10 },
        { weight: 1, total: 10 },
      ]),
    ).toThrow(/Invalid ETA configuration/);
  });

  test("rejects stages that all have a zero weight", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    expect(() =>
      sut.withStages([
        { weight: 0, total: 10 },
        { weight: 0, total: 10 },
      ]),
    ).toThrow(/Invalid ETA configuration/);
  });

  test("accepts a zero-weight stage alongside at least one positive-weight stage", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    expect(() =>
      sut.withStages([
        { weight: 0, total: 10 },
        { weight: 1, total: 10 },
      ]),
    ).not.toThrow();
  });

  test("normalizes weights by their sum, not by requiring them to already sum to 1", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let latest: IStagedEtaProgressSnapshot | undefined;
    const tracker = sut
      .withStages([
        { weight: 3, total: 10 }, // normalizes to 0.75
        { weight: 1, total: 10 }, // normalizes to 0.25
      ])
      .start((snapshot) => (latest = snapshot));

    tracker.progressTo(10); // finish stage 0 (75% of the whole job)
    runtime.intervals[0]!.callback();
    expect(latest!.currentStageIndex).toBe(0);
    expect(latest!.stagePercentage).toBe(100); // stage-local
  });
});

describe("EtaTrackBuilder.withEstimatedDuration", () => {
  test("rejects a negative duration", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    expect(() => sut.withEstimatedDuration(-1 as DurationMilliseconds)).toThrow(
      /Invalid ETA configuration/,
    );
  });

  test("accepts a zero duration", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    expect(() => sut.withEstimatedDuration(asapMilliseconds())).not.toThrow();
  });
});

describe("ProgressEtaTracker", () => {
  test("arms once timer with the configured notification interval, defaulting to 1000ms", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    sut.withKnownTotal(100).start(() => {});
    expect(runtime.intervals[0]!.delay).toBe(1000);
  });

  test("withNotificationInterval overrides the default", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    sut
      .withKnownTotal(100)
      .withNotificationInterval(250)
      .start(() => {});
    expect(runtime.intervals[0]!.delay).toBe(250);
  });

  test("withNotificationInterval clamps a negative value to 0", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    sut
      .withKnownTotal(100)
      .withNotificationInterval(-500)
      .start(() => {});
    expect(runtime.intervals[0]!.delay).toBe(0);
  });

  test("withNotificationInterval/withAlgorithm are chainable and return the same builder", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    const builder = sut.withKnownTotal(100);
    expect(builder.withNotificationInterval(500)).toBe(builder);
    expect(builder.withAlgorithm("complete")).toBe(builder);
  });

  test("withAlgorithm selects which rate algorithm estimates the completion rate", () => {
    let getTimestamp = () => asEpochMilliseconds();
    const runtime = fakeRuntime(() => getTimestamp());

    // "complete" averages the whole history, so a slow start still drags a later burst down.
    const completeSut = new EtaTrackBuilder(runtime);
    let completeSnapshot: IEtaProgressSnapshot | undefined;
    const completeTracker = completeSut
      .withKnownTotal(100)
      .withAlgorithm("complete")
      .start((s) => (completeSnapshot = s));
    getTimestamp = () => toInstant({ milliseconds: 20_000 });
    completeTracker.progressTo(20); // an early burst: 0.2/ms in isolation
    getTimestamp = () => toInstant({ milliseconds: 40_000 });
    completeTracker.progressTo(90); // then a much slower stretch
    runtime.intervals[runtime.intervals.length - 1]!.callback();
    const completeRate = completeSnapshot!.rate!;

    // "windowed" only looks at the last 10s, so the early burst falls out of its window.
    let getTimestamp2 = () => asEpochMilliseconds();
    const runtime2 = fakeRuntime(() => getTimestamp2());
    const windowedSut = new EtaTrackBuilder(runtime2);
    let windowedSnapshot: IEtaProgressSnapshot | undefined;
    const windowedTracker = windowedSut
      .withKnownTotal(100)
      .withAlgorithm("windowed")
      .start((s) => (windowedSnapshot = s));
    getTimestamp2 = () => toInstant({ milliseconds: 20_000 });
    windowedTracker.progressTo(20);
    getTimestamp2 = () => toInstant({ milliseconds: 40_000 });
    windowedTracker.progressTo(90);
    runtime2.intervals[runtime2.intervals.length - 1]!.callback();
    const windowedRate = windowedSnapshot!.rate!;

    expect(windowedRate).toBeGreaterThan(completeRate);
  });

  test("progress() adds a chunk to the amount of work completed", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let latest: IEtaProgressSnapshot | undefined;
    const tracker = sut.withKnownTotal(100).start((s) => (latest = s));
    tracker.progress(10);
    tracker.progress(15);
    runtime.intervals[0]!.callback();
    expect(latest!.completed).toBe(25);
  });

  test("progressTo() replaces the amount of work completed outright", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let latest: IEtaProgressSnapshot | undefined;
    const tracker = sut.withKnownTotal(100).start((s) => (latest = s));
    tracker.progress(50);
    tracker.progressTo(20);
    runtime.intervals[0]!.callback();
    expect(latest!.completed).toBe(20);
  });

  test("progress()/progressTo() never notify by themselves - only the interval tick does", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let notifications = 0;
    const tracker = sut.withKnownTotal(100).start(() => notifications++);
    tracker.progress(10);
    tracker.progressTo(20);
    expect(notifications).toBe(0);
  });

  test("each interval tick notifies once, with status in-progress", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    const snapshots: IEtaProgressSnapshot[] = [];
    sut.withKnownTotal(100).start((s) => snapshots.push(s));
    runtime.intervals[0]!.callback();
    runtime.intervals[0]!.callback();
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]!.status).toBe("in-progress");
  });

  test("a zero-total stage always reads as fully done, regardless of what's reported", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let latest: IEtaProgressSnapshot | undefined;
    const tracker = sut.withKnownTotal(0).start((s) => (latest = s));
    tracker.progress(0);
    runtime.intervals[0]!.callback();
    expect(latest!.percentage).toBe(0); // total 0 -> percentage defined as 0, not NaN
    expect(latest!.completed).toBe(0);
  });

  describe("nextStage()", () => {
    test("throws when called on the last (or only) stage", () => {
      // withKnownTotal's tracker is typed as IProgressEtaTracker (no nextStage), but it's backed
      // by the same concrete class as withStages's - see ProgressEtaTracker's doc comment.
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      const tracker = sut.withKnownTotal(100).start(() => {}) as unknown as {
        nextStage(): void;
      };
      expect(() => tracker.nextStage()).toThrow(/last stage/);
    });

    test("resets progress to 0 against the new stage", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let latest: IStagedEtaProgressSnapshot | undefined;
      const tracker = sut
        .withStages([
          { weight: 1, total: 10 },
          { weight: 1, total: 20 },
        ])
        .start((s) => (latest = s));
      tracker.progressTo(10);
      tracker.nextStage();
      runtime.intervals[0]!.callback();
      expect(latest!.currentStageIndex).toBe(1);
      expect(latest!.stageCompleted).toBe(0);
      expect(latest!.stageTotal).toBe(20);
    });

    test("throws once the stage advanced by a prior nextStage() call is the last one", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      const tracker = sut
        .withStages([
          { weight: 1, total: 10 },
          { weight: 1, total: 10 },
        ])
        .start(() => {});
      tracker.nextStage();
      expect(() => tracker.nextStage()).toThrow(/last stage/);
    });

    test("records the finishing stage's transition sample as its normalized weight, not double-counted", () => {
      // Regression test: nextStage() must snap the finishing stage to 100% and record that
      // transition *before* folding its weight into completedWeight - doing it the other way
      // round double-counts the finishing stage's contribution in the recorded sample, which
      // silently doubles the resulting rate (and therefore halves the estimated remaining time).
      let getTimestamp = () => asEpochMilliseconds();
      const runtime = fakeRuntime(() => getTimestamp());
      const sut = new EtaTrackBuilder(runtime);
      let latest: IStagedEtaProgressSnapshot | undefined;
      const tracker = sut
        .withStages([
          { weight: 1, total: 10 },
          { weight: 1, total: 10 },
        ])
        .withAlgorithm("complete")
        .start((s) => (latest = s));

      tracker.progressTo(10); // stage 0 fully done, at t=0
      getTimestamp = () => toInstant({ milliseconds: 1000 });
      tracker.nextStage(); // transition recorded at t=1000: overall must read as 0.5, not 1.0

      runtime.intervals[0]!.callback();
      // "complete" averages from the very first sample (t=0, overall=0) to the latest one.
      // The correct transition sample is 0.5 at t=1000 -> rate = 0.5 / 1000.
      expect(latest!.rate).toBeCloseTo(0.5 / 1000);
    });
  });

  describe("done()", () => {
    test("snaps to 100% even if less was actually reported", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let latest: IEtaProgressSnapshot | undefined;
      const tracker = sut.withKnownTotal(100).start((s) => (latest = s));
      tracker.progressTo(30);
      tracker.done();
      expect(latest!.status).toBe("done");
      expect(latest!.completed).toBe(100);
      expect(latest!.percentage).toBe(100);
    });

    test("snaps currentStageIndex to the last stage, regardless of which stage was current", () => {
      // Regression test: done() must move currentStageIndex to the last stage - otherwise the
      // final snapshot reports an earlier stage index while the job as a whole reads 100% done.
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let latest: IStagedEtaProgressSnapshot | undefined;
      const tracker = sut
        .withStages([
          { weight: 1, total: 10 },
          { weight: 1, total: 10 },
          { weight: 1, total: 10 },
        ])
        .start((s) => (latest = s));
      tracker.done(); // still on stage 0
      expect(latest!.currentStageIndex).toBe(2);
      expect(latest!.stageCount).toBe(3);
      expect(latest!.stagePercentage).toBe(100);
    });

    test("clears the interval and sends exactly one final notification", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let notifications = 0;
      const tracker = sut.withKnownTotal(100).start(() => notifications++);
      tracker.done();
      expect(runtime.cleared).toEqual([runtime.intervals[0]!.handle]);
      expect(notifications).toBe(1);
    });

    test("is idempotent - calling done() again is a no-op", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let notifications = 0;
      const tracker = sut.withKnownTotal(100).start(() => notifications++);
      tracker.done();
      tracker.done();
      expect(notifications).toBe(1);
      expect(runtime.cleared).toHaveLength(1);
    });

    test("calling abandon() after done() is also a no-op", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let notifications = 0;
      let latest: IEtaProgressSnapshot | undefined;
      const tracker = sut.withKnownTotal(100).start((s) => {
        notifications++;
        latest = s;
      });
      tracker.done();
      tracker.abandon();
      expect(notifications).toBe(1);
      expect(latest!.status).toBe("done");
    });
  });

  describe("abandon()", () => {
    test("reports the last known state as-is, without snapping to 100%", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let latest: IEtaProgressSnapshot | undefined;
      const tracker = sut.withKnownTotal(100).start((s) => (latest = s));
      tracker.progressTo(37);
      tracker.abandon();
      expect(latest!.status).toBe("abandoned");
      expect(latest!.completed).toBe(37);
      expect(latest!.percentage).toBe(37);
    });

    test("forces eta/remainingMilliseconds to undefined on the final snapshot, but keeps rate", () => {
      let getTimestamp = () => asEpochMilliseconds();
      const runtime = fakeRuntime(() => getTimestamp());
      const sut = new EtaTrackBuilder(runtime);
      let latest: IEtaProgressSnapshot | undefined;
      const tracker = sut
        .withKnownTotal(100)
        .withAlgorithm("complete")
        .start((s) => (latest = s));
      tracker.progressTo(10);
      getTimestamp = () => toInstant({ milliseconds: 1000 });
      runtime.intervals[0]!.callback();
      tracker.progressTo(50);
      tracker.abandon();
      expect(latest!.eta).toBeUndefined();
      expect(latest!.remainingMilliseconds).toBeUndefined();
      // "complete" averages from the very first sample (t=0, overall=0) to the latest one
      // (t=1000, overall=0.5, i.e. 50/100) - rate = 0.5 / 1000, as a fraction of the total.
      expect(latest!.rate).toBeCloseTo(0.5 / 1000);
    });

    test("clears the interval and sends exactly one final notification", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let notifications = 0;
      const tracker = sut.withKnownTotal(100).start(() => notifications++);
      tracker.abandon();
      expect(runtime.cleared).toEqual([runtime.intervals[0]!.handle]);
      expect(notifications).toBe(1);
    });

    test("is idempotent - calling abandon() again is a no-op", () => {
      const runtime = fakeRuntime(() => asEpochMilliseconds());
      const sut = new EtaTrackBuilder(runtime);
      let notifications = 0;
      const tracker = sut.withKnownTotal(100).start(() => notifications++);
      tracker.abandon();
      tracker.abandon();
      expect(notifications).toBe(1);
    });
  });
});

describe("DurationEtaTracker", () => {
  test("arms every timers with the configured notification interval, defaulting to 1000ms", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    sut.withEstimatedDuration(toDuration({ milliseconds: 5000 })).start(() => {});
    expect(runtime.intervals[0]!.delay).toBe(1000);
  });

  test("withNotificationInterval overrides the default", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    sut
      .withEstimatedDuration(toDuration({ milliseconds: 5000 }))
      .withNotificationInterval(200)
      .start(() => {});
    expect(runtime.intervals[0]!.delay).toBe(200);
  });

  test("withNotificationInterval clamps a negative value to 0", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    sut
      .withEstimatedDuration(toDuration({ milliseconds: 5000 }))
      .withNotificationInterval(-1)
      .start(() => {});
    expect(runtime.intervals[0]!.delay).toBe(0);
  });

  test("withNotificationInterval is chainable and returns the same builder", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    const builder = sut.withEstimatedDuration(toDuration({ milliseconds: 5000 }));
    expect(builder.withNotificationInterval(500)).toBe(builder);
  });

  test("eta is fixed at startTime + expectedDurationMilliseconds from the very first tick", () => {
    let getTimestamp = () => toInstant({ milliseconds: 1000 });
    const runtime = fakeRuntime(() => getTimestamp());
    const sut = new EtaTrackBuilder(runtime);
    let latest: IEtaDurationSnapshot | undefined;
    sut.withEstimatedDuration(toDuration({ milliseconds: 5000 })).start((s) => (latest = s));
    getTimestamp = () => toInstant({ milliseconds: 2000 });
    runtime.intervals[0]!.callback();
    expect(latest!.status).toBe("in-progress");
    expect(latest!.startTime).toBe(1000);
    expect(latest!.elapsedMilliseconds).toBe(1000);
    expect(latest!.eta).toBe(6000);
    expect(latest!.remainingMilliseconds).toBe(4000);
  });

  test("eta stays fixed across multiple ticks", () => {
    let getTimestamp = () => asEpochMilliseconds();
    const runtime = fakeRuntime(() => getTimestamp());
    const sut = new EtaTrackBuilder(runtime);
    const etas: (number | undefined)[] = [];
    sut.withEstimatedDuration(toDuration({ milliseconds: 5000 })).start((s) => etas.push(s.eta));
    getTimestamp = () => toInstant({ milliseconds: 1000 });
    runtime.intervals[0]!.callback();
    getTimestamp = () => toInstant({ milliseconds: 2000 });
    runtime.intervals[0]!.callback();
    expect(etas).toEqual([5000, 5000]);
  });

  test("done() snaps eta to the completion time, with a zero remainingMilliseconds", () => {
    let getTimestamp = () => asEpochMilliseconds();
    const runtime = fakeRuntime(() => getTimestamp());
    const sut = new EtaTrackBuilder(runtime);
    let latest: IEtaDurationSnapshot | undefined;
    const tracker = sut
      .withEstimatedDuration(toDuration({ milliseconds: 5000 }))
      .start((s) => (latest = s));
    getTimestamp = () => toInstant({ milliseconds: 2000 }); // finished early
    tracker.done();
    expect(latest!.status).toBe("done");
    expect(latest!.eta).toBe(2000);
    expect(latest!.remainingMilliseconds).toBe(0);
  });

  test("done() clears the interval and sends exactly one final notification", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let notifications = 0;
    const tracker = sut
      .withEstimatedDuration(toDuration({ milliseconds: 5000 }))
      .start(() => notifications++);
    tracker.done();
    expect(runtime.cleared).toEqual([runtime.intervals[0]!.handle]);
    expect(notifications).toBe(1);
  });

  test("done() is idempotent", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let notifications = 0;
    const tracker = sut
      .withEstimatedDuration(toDuration({ milliseconds: 5000 }))
      .start(() => notifications++);
    tracker.done();
    tracker.done();
    expect(notifications).toBe(1);
  });

  test("abandon() forces eta/remainingMilliseconds to undefined - nothing left to estimate", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let latest: IEtaDurationSnapshot | undefined;
    const tracker = sut
      .withEstimatedDuration(toDuration({ milliseconds: 5000 }))
      .start((s) => (latest = s));
    tracker.abandon();
    expect(latest!.status).toBe("abandoned");
    expect(latest!.eta).toBeUndefined();
    expect(latest!.remainingMilliseconds).toBeUndefined();
  });

  test("abandon() clears the interval and sends exactly one final notification", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let notifications = 0;
    const tracker = sut
      .withEstimatedDuration(toDuration({ milliseconds: 5000 }))
      .start(() => notifications++);
    tracker.abandon();
    expect(runtime.cleared).toEqual([runtime.intervals[0]!.handle]);
    expect(notifications).toBe(1);
  });

  test("abandon() is idempotent, including after done()", () => {
    const runtime = fakeRuntime(() => asEpochMilliseconds());
    const sut = new EtaTrackBuilder(runtime);
    let notifications = 0;
    const tracker = sut
      .withEstimatedDuration(toDuration({ milliseconds: 5000 }))
      .start(() => notifications++);
    tracker.done();
    tracker.abandon();
    expect(notifications).toBe(1);
  });
});

/*
 * Confirms withKnownTotal's IProgressEtaTracker is satisfied by the very same concrete class
 * that backs withStages's IStagedProgressEtaTracker - see ProgressEtaTracker's doc comment.
 */
test("withKnownTotal's tracker structurally satisfies IProgressEtaTracker", () => {
  const runtime = fakeRuntime(() => asEpochMilliseconds());
  const sut = new EtaTrackBuilder(runtime);
  const tracker: IProgressEtaTracker = sut.withKnownTotal(100).start(() => {});
  expect(typeof tracker.progress).toBe("function");
  expect(typeof tracker.progressTo).toBe("function");
  expect(typeof tracker.done).toBe("function");
  expect(typeof tracker.abandon).toBe("function");
});
