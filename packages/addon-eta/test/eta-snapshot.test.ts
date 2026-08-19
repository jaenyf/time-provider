import { describe, expect, test, vi } from "vite-plus/test";
import {
  EtaDurationSnapshot,
  EtaProgressSnapshot,
  StagedEtaProgressSnapshot,
} from "../src/eta-snapshot.ts";
import type { IRateEstimator } from "../src/rate-estimator.ts";
import { asEpochMilliseconds, toInstant } from "@time-provider/core";

function fakeRateEstimator(rate: number | undefined): IRateEstimator {
  return { addSample: () => {}, estimateRate: () => rate };
}

describe("EtaProgressSnapshot", () => {
  test("carries the raw fields as given", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      toInstant({ milliseconds: 1000 }),
      toInstant({ milliseconds: 1500 }),
      30,
      100,
      undefined,
    );
    expect(sut.status).toBe("in-progress");
    expect(sut.startTime).toBe(1000);
    expect(sut.completed).toBe(30);
    expect(sut.total).toBe(100);
    expect(sut.elapsedMilliseconds).toBe(500);
  });

  test("remaining is total minus completed", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      30,
      100,
      undefined,
    );
    expect(sut.remaining).toBe(70);
  });

  test("percentage is completed over total, as a percentage", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      30,
      100,
      undefined,
    );
    expect(sut.percentage).toBe(30);
  });

  test("percentage is 0 when total is 0, rather than dividing by zero", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      0,
      0,
      undefined,
    );
    expect(sut.percentage).toBe(0);
  });

  test("rate is undefined without a rate estimator", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      30,
      100,
      undefined,
    );
    expect(sut.rate).toBeUndefined();
  });

  test("rate comes from the rate estimator", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      30,
      100,
      fakeRateEstimator(0.05),
    );
    expect(sut.rate).toBe(0.05);
  });

  test("eta is undefined when there's no rate yet", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      30,
      100,
      fakeRateEstimator(undefined),
    );
    expect(sut.eta).toBeUndefined();
    expect(sut.remainingMilliseconds).toBeUndefined();
  });

  test("eta is undefined when the rate isn't positive", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      30,
      100,
      fakeRateEstimator(0),
    );
    expect(sut.eta).toBeUndefined();
  });

  test("eta projects the remaining work forward at the estimated rate", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      30,
      100,
      fakeRateEstimator(0.1),
    );
    expect(sut.eta).toBe(1000 + 70 / 0.1);
  });

  test("remainingMilliseconds is eta expressed as a duration from now", () => {
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      30,
      100,
      fakeRateEstimator(0.1),
    );
    expect(sut.remainingMilliseconds).toBe(sut.eta! - 1000);
  });

  test("once abandoned, rate stays available but eta/remainingMilliseconds are forced undefined", () => {
    const sut = new EtaProgressSnapshot(
      "abandoned",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      30,
      100,
      fakeRateEstimator(0.1),
    );
    expect(sut.rate).toBe(0.1);
    expect(sut.eta).toBeUndefined();
    expect(sut.remainingMilliseconds).toBeUndefined();
  });

  test("never computes rate/eta/remainingMilliseconds unless they're actually read", () => {
    const estimator: IRateEstimator = {
      addSample: () => {},
      estimateRate: () => {
        throw new Error("should not have been called");
      },
    };
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      30,
      100,
      estimator,
    );
    expect(sut.status).toBe("in-progress");
    expect(sut.completed).toBe(30);
    expect(sut.total).toBe(100);
    expect(sut.remaining).toBe(70);
    expect(sut.percentage).toBe(30);
    expect(sut.elapsedMilliseconds).toBe(1000);
  });

  test("memoizes rate: the estimator is only ever asked once, no matter how many fields are read", () => {
    const estimateRate = vi.fn(() => 0.1);
    const estimator: IRateEstimator = { addSample: () => {}, estimateRate };
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      30,
      100,
      estimator,
    );
    void sut.eta;
    void sut.remainingMilliseconds;
    void sut.rate;
    void sut.rate;
    expect(estimateRate).toHaveBeenCalledTimes(1);
  });

  test("memoizes an undefined rate too, not just a defined one", () => {
    const estimateRate = vi.fn(() => undefined);
    const estimator: IRateEstimator = { addSample: () => {}, estimateRate };
    const sut = new EtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      30,
      100,
      estimator,
    );
    void sut.rate;
    void sut.rate;
    expect(estimateRate).toHaveBeenCalledTimes(1);
  });
});

describe("StagedEtaProgressSnapshot", () => {
  test("stageCompleted/stageTotal/stagePercentage are local to the current stage, not the overall job", () => {
    const sut = new StagedEtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      /* stageCompleted */ 25,
      /* stageTotal */ 50,
      /* currentStageIndex */ 1,
      /* stageCount */ 3,
      /* overallFraction */ 0.9,
      undefined,
    );
    expect(sut.stageCompleted).toBe(25);
    expect(sut.stageTotal).toBe(50);
    expect(sut.stageRemaining).toBe(25);
    expect(sut.stagePercentage).toBe(50);
  });

  test("stagePercentage is 0 when the current stage's total is 0", () => {
    const sut = new StagedEtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      0,
      0,
      0,
      1,
      0,
      undefined,
    );
    expect(sut.stagePercentage).toBe(0);
  });

  test("currentStageIndex and stageCount are carried as given", () => {
    const sut = new StagedEtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      0,
      10,
      2,
      4,
      0.5,
      undefined,
    );
    expect(sut.currentStageIndex).toBe(2);
    expect(sut.stageCount).toBe(4);
  });

  test("rate/eta/remainingMilliseconds are overall, weighted across every stage - not stage-local", () => {
    const sut = new StagedEtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      /* stageCompleted */ 5,
      /* stageTotal */ 10, // 50% of this stage alone
      1,
      2,
      /* overallFraction */ 0.75, // but 75% of the whole job
      fakeRateEstimator(0.1),
    );
    expect(sut.rate).toBe(0.1);
    // eta is projected from the *overall* remaining fraction (1 - 0.75), not the stage's.
    expect(sut.eta).toBe(1000 + (1 - 0.75) / 0.1);
    expect(sut.remainingMilliseconds).toBe(sut.eta! - 1000);
  });

  test("rate/eta/remainingMilliseconds are undefined once abandoned, given no rate estimator", () => {
    const sut = new StagedEtaProgressSnapshot(
      "abandoned",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      5,
      10,
      0,
      2,
      0.5,
      undefined,
    );
    expect(sut.rate).toBeUndefined();
    expect(sut.eta).toBeUndefined();
    expect(sut.remainingMilliseconds).toBeUndefined();
  });

  test("once abandoned, rate stays the last measured speed - only eta/remainingMilliseconds are forced undefined", () => {
    const sut = new StagedEtaProgressSnapshot(
      "abandoned",
      asEpochMilliseconds(),
      toInstant({ milliseconds: 1000 }),
      5,
      10,
      0,
      2,
      0.5,
      fakeRateEstimator(0.1),
    );
    expect(sut.rate).toBe(0.1);
    expect(sut.eta).toBeUndefined();
    expect(sut.remainingMilliseconds).toBeUndefined();
  });

  test("also implements IEtaProgressSnapshot, aliasing completed/total/remaining/percentage to the stage-local values", () => {
    // This is what lets ProgressEtaTracker back both withKnownTotal (typed narrower, as
    // IEtaProgressSnapshot) and withStages from the same concrete class - see the class's doc
    // comment.
    const sut = new StagedEtaProgressSnapshot(
      "in-progress",
      asEpochMilliseconds(),
      asEpochMilliseconds(),
      /* stageCompleted */ 25,
      /* stageTotal */ 50,
      1,
      3,
      0.9,
      undefined,
    );
    expect(sut.completed).toBe(sut.stageCompleted);
    expect(sut.total).toBe(sut.stageTotal);
    expect(sut.remaining).toBe(sut.stageRemaining);
    expect(sut.percentage).toBe(sut.stagePercentage);
  });
});

describe("EtaDurationSnapshot", () => {
  test("carries the raw fields as given", () => {
    const sut = new EtaDurationSnapshot(
      "in-progress",
      toInstant({ milliseconds: 1000 }),
      toInstant({ milliseconds: 1500 }),
      toInstant({ milliseconds: 5000 }),
    );
    expect(sut.status).toBe("in-progress");
    expect(sut.startTime).toBe(1000);
    expect(sut.elapsedMilliseconds).toBe(500);
    expect(sut.eta).toBe(5000);
  });

  test("remainingMilliseconds is eta minus now", () => {
    const sut = new EtaDurationSnapshot(
      "in-progress",
      toInstant({ milliseconds: 1000 }),
      toInstant({ milliseconds: 1500 }),
      toInstant({ milliseconds: 5000 }),
    );
    expect(sut.remainingMilliseconds).toBe(3500);
  });

  test("remainingMilliseconds is undefined when eta is undefined", () => {
    const sut = new EtaDurationSnapshot(
      "abandoned",
      toInstant({ milliseconds: 1000 }),
      toInstant({ milliseconds: 1500 }),
      undefined,
    );
    expect(sut.eta).toBeUndefined();
    expect(sut.remainingMilliseconds).toBeUndefined();
  });
});
