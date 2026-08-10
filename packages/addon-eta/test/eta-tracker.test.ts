import { describe, expect, test } from "vite-plus/test";
import type { DueHandle, IScheduler } from "@time-provider/core";
import { EtaTrackBuilder } from "../src/eta-tracker.ts";
import type {
  IEtaDurationSnapshot,
  IEtaProgressSnapshot,
  IStagedEtaProgressSnapshot,
  IProgressEtaTracker,
} from "../src/types.ts";

/*
 * Every tracker in this addon only ever touches IScheduler.setInterval/clearInterval, so a
 * minimal fake capturing those calls is enough - no real runtime needed.
 */
function fakeScheduler(): {
  scheduler: IScheduler;
  intervals: { callback: () => void; delay: number | undefined; handle: DueHandle }[];
  cleared: DueHandle[];
} {
  const intervals: { callback: () => void; delay: number | undefined; handle: DueHandle }[] = [];
  const cleared: DueHandle[] = [];
  let issued = 0;
  return {
    intervals,
    cleared,
    scheduler: {
      setTimeout() {
        throw new Error("not used by the eta addon");
      },
      clearTimeout() {
        throw new Error("not used by the eta addon");
      },
      setInterval(callback, millisecondsDelay) {
        const handle = { kind: 1, id: issued++ } as unknown as DueHandle;
        intervals.push({ callback, delay: millisecondsDelay, handle });
        return handle;
      },
      clearInterval(handle) {
        cleared.push(handle);
      },
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

function clock(startAt = 0): { now: () => number; set: (value: number) => void } {
  let value = startAt;
  return { now: () => value, set: (v) => (value = v) };
}

describe("EtaTrackBuilder.withKnownTotal", () => {
  test("rejects a negative total", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    expect(() => sut.withKnownTotal(-1)).toThrow(/Invalid ETA configuration/);
  });

  test("accepts a zero total", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    expect(() => sut.withKnownTotal(0)).not.toThrow();
  });

  test("arms a single-stage schedule", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    sut.withKnownTotal(100).start(() => {});
    expect(intervals).toHaveLength(1);
  });
});

describe("EtaTrackBuilder.withStages", () => {
  test("rejects an empty stage list", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    expect(() => sut.withStages([])).toThrow(/Invalid ETA configuration/);
  });

  test("rejects a negative stage weight", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    expect(() =>
      sut.withStages([
        { weight: -1, total: 10 },
        { weight: 1, total: 10 },
      ]),
    ).toThrow(/Invalid ETA configuration/);
  });

  test("rejects stages that all have a zero weight", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    expect(() =>
      sut.withStages([
        { weight: 0, total: 10 },
        { weight: 0, total: 10 },
      ]),
    ).toThrow(/Invalid ETA configuration/);
  });

  test("accepts a zero-weight stage alongside at least one positive-weight stage", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    expect(() =>
      sut.withStages([
        { weight: 0, total: 10 },
        { weight: 1, total: 10 },
      ]),
    ).not.toThrow();
  });

  test("normalizes weights by their sum, not by requiring them to already sum to 1", () => {
    const { scheduler, intervals } = fakeScheduler();
    const time = clock(0);
    const sut = new EtaTrackBuilder(scheduler, time.now);
    let latest: IStagedEtaProgressSnapshot | undefined;
    const tracker = sut
      .withStages([
        { weight: 3, total: 10 }, // normalizes to 0.75
        { weight: 1, total: 10 }, // normalizes to 0.25
      ])
      .start((snapshot) => (latest = snapshot));

    tracker.progressTo(10); // finish stage 0 (75% of the whole job)
    intervals[0]!.callback();
    expect(latest!.currentStageIndex).toBe(0);
    expect(latest!.stagePercentage).toBe(100); // stage-local
  });
});

describe("EtaTrackBuilder.withEstimatedDuration", () => {
  test("rejects a negative duration", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    expect(() => sut.withEstimatedDuration(-1)).toThrow(/Invalid ETA configuration/);
  });

  test("accepts a zero duration", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    expect(() => sut.withEstimatedDuration(0)).not.toThrow();
  });
});

describe("ProgressEtaTracker", () => {
  test("arms setInterval with the configured notification interval, defaulting to 1000ms", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    sut.withKnownTotal(100).start(() => {});
    expect(intervals[0]!.delay).toBe(1000);
  });

  test("withNotificationInterval overrides the default", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    sut
      .withKnownTotal(100)
      .withNotificationInterval(250)
      .start(() => {});
    expect(intervals[0]!.delay).toBe(250);
  });

  test("withNotificationInterval clamps a negative value to 0", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    sut
      .withKnownTotal(100)
      .withNotificationInterval(-500)
      .start(() => {});
    expect(intervals[0]!.delay).toBe(0);
  });

  test("withNotificationInterval/withAlgorithm are chainable and return the same builder", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    const builder = sut.withKnownTotal(100);
    expect(builder.withNotificationInterval(500)).toBe(builder);
    expect(builder.withAlgorithm("complete")).toBe(builder);
  });

  test("withAlgorithm selects which rate algorithm estimates the completion rate", () => {
    const { scheduler, intervals } = fakeScheduler();
    const time = clock(0);

    // "complete" averages the whole history, so a slow start still drags a later burst down.
    const completeSut = new EtaTrackBuilder(scheduler, time.now);
    let completeSnapshot: IEtaProgressSnapshot | undefined;
    const completeTracker = completeSut
      .withKnownTotal(100)
      .withAlgorithm("complete")
      .start((s) => (completeSnapshot = s));
    time.set(20_000);
    completeTracker.progressTo(20); // an early burst: 0.2/ms in isolation
    time.set(40_000);
    completeTracker.progressTo(90); // then a much slower stretch
    intervals[intervals.length - 1]!.callback();
    const completeRate = completeSnapshot!.rate!;

    // "windowed" only looks at the last 10s, so the early burst falls out of its window.
    const { scheduler: scheduler2, intervals: intervals2 } = fakeScheduler();
    const time2 = clock(0);
    const windowedSut = new EtaTrackBuilder(scheduler2, time2.now);
    let windowedSnapshot: IEtaProgressSnapshot | undefined;
    const windowedTracker = windowedSut
      .withKnownTotal(100)
      .withAlgorithm("windowed")
      .start((s) => (windowedSnapshot = s));
    time2.set(20_000);
    windowedTracker.progressTo(20);
    time2.set(40_000);
    windowedTracker.progressTo(90);
    intervals2[intervals2.length - 1]!.callback();
    const windowedRate = windowedSnapshot!.rate!;

    expect(windowedRate).toBeGreaterThan(completeRate);
  });

  test("progress() adds a chunk to the amount of work completed", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let latest: IEtaProgressSnapshot | undefined;
    const tracker = sut.withKnownTotal(100).start((s) => (latest = s));
    tracker.progress(10);
    tracker.progress(15);
    intervals[0]!.callback();
    expect(latest!.completed).toBe(25);
  });

  test("progressTo() replaces the amount of work completed outright", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let latest: IEtaProgressSnapshot | undefined;
    const tracker = sut.withKnownTotal(100).start((s) => (latest = s));
    tracker.progress(50);
    tracker.progressTo(20);
    intervals[0]!.callback();
    expect(latest!.completed).toBe(20);
  });

  test("progress()/progressTo() never notify by themselves - only the interval tick does", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let notifications = 0;
    const tracker = sut.withKnownTotal(100).start(() => notifications++);
    tracker.progress(10);
    tracker.progressTo(20);
    expect(notifications).toBe(0);
  });

  test("each interval tick notifies once, with status in-progress", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    const snapshots: IEtaProgressSnapshot[] = [];
    sut.withKnownTotal(100).start((s) => snapshots.push(s));
    intervals[0]!.callback();
    intervals[0]!.callback();
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]!.status).toBe("in-progress");
  });

  test("a zero-total stage always reads as fully done, regardless of what's reported", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let latest: IEtaProgressSnapshot | undefined;
    const tracker = sut.withKnownTotal(0).start((s) => (latest = s));
    tracker.progress(0);
    intervals[0]!.callback();
    expect(latest!.percentage).toBe(0); // total 0 -> percentage defined as 0, not NaN
    expect(latest!.completed).toBe(0);
  });

  describe("nextStage()", () => {
    test("throws when called on the last (or only) stage", () => {
      // withKnownTotal's tracker is typed as IProgressEtaTracker (no nextStage), but it's backed
      // by the same concrete class as withStages's - see ProgressEtaTracker's doc comment.
      const { scheduler } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
      const tracker = sut.withKnownTotal(100).start(() => {}) as unknown as {
        nextStage(): void;
      };
      expect(() => tracker.nextStage()).toThrow(/last stage/);
    });

    test("resets progress to 0 against the new stage", () => {
      const { scheduler, intervals } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
      let latest: IStagedEtaProgressSnapshot | undefined;
      const tracker = sut
        .withStages([
          { weight: 1, total: 10 },
          { weight: 1, total: 20 },
        ])
        .start((s) => (latest = s));
      tracker.progressTo(10);
      tracker.nextStage();
      intervals[0]!.callback();
      expect(latest!.currentStageIndex).toBe(1);
      expect(latest!.stageCompleted).toBe(0);
      expect(latest!.stageTotal).toBe(20);
    });

    test("throws once the stage advanced by a prior nextStage() call is the last one", () => {
      const { scheduler } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
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
      const { scheduler, intervals } = fakeScheduler();
      const time = clock(0);
      const sut = new EtaTrackBuilder(scheduler, time.now);
      let latest: IStagedEtaProgressSnapshot | undefined;
      const tracker = sut
        .withStages([
          { weight: 1, total: 10 },
          { weight: 1, total: 10 },
        ])
        .withAlgorithm("complete")
        .start((s) => (latest = s));

      tracker.progressTo(10); // stage 0 fully done, at t=0
      time.set(1000);
      tracker.nextStage(); // transition recorded at t=1000: overall must read as 0.5, not 1.0

      intervals[0]!.callback();
      // "complete" averages from the very first sample (t=0, overall=0) to the latest one.
      // The correct transition sample is 0.5 at t=1000 -> rate = 0.5 / 1000.
      expect(latest!.rate).toBeCloseTo(0.5 / 1000);
    });
  });

  describe("done()", () => {
    test("snaps to 100% even if less was actually reported", () => {
      const { scheduler } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
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
      const { scheduler } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
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
      const { scheduler, intervals, cleared } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
      let notifications = 0;
      const tracker = sut.withKnownTotal(100).start(() => notifications++);
      tracker.done();
      expect(cleared).toEqual([intervals[0]!.handle]);
      expect(notifications).toBe(1);
    });

    test("is idempotent - calling done() again is a no-op", () => {
      const { scheduler, cleared } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
      let notifications = 0;
      const tracker = sut.withKnownTotal(100).start(() => notifications++);
      tracker.done();
      tracker.done();
      expect(notifications).toBe(1);
      expect(cleared).toHaveLength(1);
    });

    test("calling abandon() after done() is also a no-op", () => {
      const { scheduler } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
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
      const { scheduler } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
      let latest: IEtaProgressSnapshot | undefined;
      const tracker = sut.withKnownTotal(100).start((s) => (latest = s));
      tracker.progressTo(37);
      tracker.abandon();
      expect(latest!.status).toBe("abandoned");
      expect(latest!.completed).toBe(37);
      expect(latest!.percentage).toBe(37);
    });

    test("forces eta/remainingMilliseconds to undefined on the final snapshot, but keeps rate", () => {
      const { scheduler, intervals } = fakeScheduler();
      const time = clock(0);
      const sut = new EtaTrackBuilder(scheduler, time.now);
      let latest: IEtaProgressSnapshot | undefined;
      const tracker = sut
        .withKnownTotal(100)
        .withAlgorithm("complete")
        .start((s) => (latest = s));
      tracker.progressTo(10);
      time.set(1000);
      intervals[0]!.callback();
      tracker.progressTo(50);
      tracker.abandon();
      expect(latest!.eta).toBeUndefined();
      expect(latest!.remainingMilliseconds).toBeUndefined();
      // "complete" averages from the very first sample (t=0, overall=0) to the latest one
      // (t=1000, overall=0.5, i.e. 50/100) - rate = 0.5 / 1000, as a fraction of the total.
      expect(latest!.rate).toBeCloseTo(0.5 / 1000);
    });

    test("clears the interval and sends exactly one final notification", () => {
      const { scheduler, intervals, cleared } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
      let notifications = 0;
      const tracker = sut.withKnownTotal(100).start(() => notifications++);
      tracker.abandon();
      expect(cleared).toEqual([intervals[0]!.handle]);
      expect(notifications).toBe(1);
    });

    test("is idempotent - calling abandon() again is a no-op", () => {
      const { scheduler } = fakeScheduler();
      const sut = new EtaTrackBuilder(scheduler, () => 0);
      let notifications = 0;
      const tracker = sut.withKnownTotal(100).start(() => notifications++);
      tracker.abandon();
      tracker.abandon();
      expect(notifications).toBe(1);
    });
  });
});

describe("DurationEtaTracker", () => {
  test("arms setInterval with the configured notification interval, defaulting to 1000ms", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    sut.withEstimatedDuration(5000).start(() => {});
    expect(intervals[0]!.delay).toBe(1000);
  });

  test("withNotificationInterval overrides the default", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    sut
      .withEstimatedDuration(5000)
      .withNotificationInterval(200)
      .start(() => {});
    expect(intervals[0]!.delay).toBe(200);
  });

  test("withNotificationInterval clamps a negative value to 0", () => {
    const { scheduler, intervals } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    sut
      .withEstimatedDuration(5000)
      .withNotificationInterval(-1)
      .start(() => {});
    expect(intervals[0]!.delay).toBe(0);
  });

  test("withNotificationInterval is chainable and returns the same builder", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    const builder = sut.withEstimatedDuration(5000);
    expect(builder.withNotificationInterval(500)).toBe(builder);
  });

  test("eta is fixed at startTime + expectedDurationMilliseconds from the very first tick", () => {
    const { scheduler, intervals } = fakeScheduler();
    const time = clock(1000);
    const sut = new EtaTrackBuilder(scheduler, time.now);
    let latest: IEtaDurationSnapshot | undefined;
    sut.withEstimatedDuration(5000).start((s) => (latest = s));
    time.set(2000);
    intervals[0]!.callback();
    expect(latest!.status).toBe("in-progress");
    expect(latest!.startTime).toBe(1000);
    expect(latest!.elapsedMilliseconds).toBe(1000);
    expect(latest!.eta).toBe(6000);
    expect(latest!.remainingMilliseconds).toBe(4000);
  });

  test("eta stays fixed across multiple ticks", () => {
    const { scheduler, intervals } = fakeScheduler();
    const time = clock(0);
    const sut = new EtaTrackBuilder(scheduler, time.now);
    const etas: (number | undefined)[] = [];
    sut.withEstimatedDuration(5000).start((s) => etas.push(s.eta));
    time.set(1000);
    intervals[0]!.callback();
    time.set(2000);
    intervals[0]!.callback();
    expect(etas).toEqual([5000, 5000]);
  });

  test("done() snaps eta to the completion time, with a zero remainingMilliseconds", () => {
    const { scheduler } = fakeScheduler();
    const time = clock(0);
    const sut = new EtaTrackBuilder(scheduler, time.now);
    let latest: IEtaDurationSnapshot | undefined;
    const tracker = sut.withEstimatedDuration(5000).start((s) => (latest = s));
    time.set(2000); // finished early
    tracker.done();
    expect(latest!.status).toBe("done");
    expect(latest!.eta).toBe(2000);
    expect(latest!.remainingMilliseconds).toBe(0);
  });

  test("done() clears the interval and sends exactly one final notification", () => {
    const { scheduler, intervals, cleared } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let notifications = 0;
    const tracker = sut.withEstimatedDuration(5000).start(() => notifications++);
    tracker.done();
    expect(cleared).toEqual([intervals[0]!.handle]);
    expect(notifications).toBe(1);
  });

  test("done() is idempotent", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let notifications = 0;
    const tracker = sut.withEstimatedDuration(5000).start(() => notifications++);
    tracker.done();
    tracker.done();
    expect(notifications).toBe(1);
  });

  test("abandon() forces eta/remainingMilliseconds to undefined - nothing left to estimate", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let latest: IEtaDurationSnapshot | undefined;
    const tracker = sut.withEstimatedDuration(5000).start((s) => (latest = s));
    tracker.abandon();
    expect(latest!.status).toBe("abandoned");
    expect(latest!.eta).toBeUndefined();
    expect(latest!.remainingMilliseconds).toBeUndefined();
  });

  test("abandon() clears the interval and sends exactly one final notification", () => {
    const { scheduler, intervals, cleared } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let notifications = 0;
    const tracker = sut.withEstimatedDuration(5000).start(() => notifications++);
    tracker.abandon();
    expect(cleared).toEqual([intervals[0]!.handle]);
    expect(notifications).toBe(1);
  });

  test("abandon() is idempotent, including after done()", () => {
    const { scheduler } = fakeScheduler();
    const sut = new EtaTrackBuilder(scheduler, () => 0);
    let notifications = 0;
    const tracker = sut.withEstimatedDuration(5000).start(() => notifications++);
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
  const { scheduler } = fakeScheduler();
  const sut = new EtaTrackBuilder(scheduler, () => 0);
  const tracker: IProgressEtaTracker = sut.withKnownTotal(100).start(() => {});
  expect(typeof tracker.progress).toBe("function");
  expect(typeof tracker.progressTo).toBe("function");
  expect(typeof tracker.done).toBe("function");
  expect(typeof tracker.abandon).toBe("function");
});
