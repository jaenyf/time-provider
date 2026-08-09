import { describe, expect, test } from "vite-plus/test";
import { createRateEstimator } from "../src/rate-estimator.ts";

describe("createRateEstimator", () => {
  test("selects the estimator matching each algorithm", () => {
    expect(createRateEstimator("complete").estimateRate()).toBeUndefined();
    expect(createRateEstimator("windowed").estimateRate()).toBeUndefined();
    expect(createRateEstimator("smoothed").estimateRate()).toBeUndefined();
  });
});

describe("CompleteRateEstimator", () => {
  test("has no rate before any sample", () => {
    const sut = createRateEstimator("complete");
    expect(sut.estimateRate()).toBeUndefined();
  });

  test("has no rate with only one sample", () => {
    const sut = createRateEstimator("complete");
    sut.addSample(0, 0);
    expect(sut.estimateRate()).toBeUndefined();
  });

  test("has no rate when every sample shares the same timestamp", () => {
    const sut = createRateEstimator("complete");
    sut.addSample(1000, 0);
    sut.addSample(1000, 5);
    expect(sut.estimateRate()).toBeUndefined();
  });

  test("averages between the very first and the latest sample, ignoring what's in between", () => {
    const sut = createRateEstimator("complete");
    sut.addSample(0, 0);
    sut.addSample(1000, 100); // a burst that alone would suggest 0.1/ms
    sut.addSample(10_000, 200); // then nothing for a while
    expect(sut.estimateRate()).toBe(200 / 10_000);
  });
});

describe("WindowedRateEstimator", () => {
  test("has no rate with fewer than two samples", () => {
    const sut = createRateEstimator("windowed");
    expect(sut.estimateRate()).toBeUndefined();
    sut.addSample(0, 0);
    expect(sut.estimateRate()).toBeUndefined();
  });

  test("has no rate when the two most recent samples share the same timestamp", () => {
    const sut = createRateEstimator("windowed");
    sut.addSample(0, 0);
    sut.addSample(0, 5);
    expect(sut.estimateRate()).toBeUndefined();
  });

  test("averages across every sample while they all fit within the window", () => {
    const sut = createRateEstimator("windowed");
    sut.addSample(0, 0);
    sut.addSample(5000, 50);
    expect(sut.estimateRate()).toBe(50 / 5000);
  });

  test("drops samples older than the window once newer ones push them out", () => {
    const sut = createRateEstimator("windowed");
    sut.addSample(0, 0);
    sut.addSample(100_000, 1); // 2nd sample only - window has nothing to evict yet
    expect(sut.estimateRate()).toBe(1 / 100_000);

    sut.addSample(200_000, 5); // now the t=0 sample is well outside the 10s window
    // The t=0 sample must have been evicted: the rate reflects only the last two samples.
    expect(sut.estimateRate()).toBe((5 - 1) / (200_000 - 100_000));
  });
});

describe("SmoothedRateEstimator", () => {
  test("has no rate before any sample", () => {
    const sut = createRateEstimator("smoothed");
    expect(sut.estimateRate()).toBeUndefined();
  });

  test("has no rate after a single sample", () => {
    const sut = createRateEstimator("smoothed");
    sut.addSample(0, 0);
    expect(sut.estimateRate()).toBeUndefined();
  });

  test("starts from the first pair's instantaneous rate", () => {
    const sut = createRateEstimator("smoothed");
    sut.addSample(0, 0);
    sut.addSample(1000, 100);
    expect(sut.estimateRate()).toBe(100 / 1000);
  });

  test("blends each new instantaneous rate into the running estimate", () => {
    const sut = createRateEstimator("smoothed");
    sut.addSample(0, 0);
    sut.addSample(1000, 100); // instantaneous 0.1/ms -> rate = 0.1
    sut.addSample(2000, 300); // instantaneous 0.2/ms -> rate = 0.3*0.2 + 0.7*0.1
    expect(sut.estimateRate()).toBeCloseTo(0.3 * 0.2 + 0.7 * 0.1);
  });

  test("ignores a sample that doesn't move time forward", () => {
    const sut = createRateEstimator("smoothed");
    sut.addSample(0, 0);
    sut.addSample(1000, 100);
    const rateBefore = sut.estimateRate();
    sut.addSample(1000, 999); // same timestamp as the previous sample
    expect(sut.estimateRate()).toBe(rateBefore);
  });
});
