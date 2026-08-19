import { describe, test, expect } from "vite-plus/test";
import { DeterministicPerformance } from "../src/performance/deterministic-performance.ts";
import type { BaseDeterministicRuntime } from "../src/runtimes/deterministic-runtime.ts";
import { asEpochMilliseconds, toDuration, toInstant } from "../src/helpers/branded-types.ts";

function fakeRuntimeWithTimestamps(
  timestamps: readonly number[],
): BaseDeterministicRuntime<unknown> {
  let index = 0;
  return {
    timestampNow: () => timestamps[index++],
  } as unknown as BaseDeterministicRuntime<unknown>;
}

describe("DeterministicPerformance", () => {
  const createUninitializedSUT = () => new DeterministicPerformance();

  describe("uninitialized", () => {
    const uninitializedErrorMessage = "Deterministic performance has not been initialized";
    test("now throws", () => {
      const sut = createUninitializedSUT();
      expect(() => sut.now()).toThrow(uninitializedErrorMessage);
    });
    test("measure throws", () => {
      const sut = createUninitializedSUT();
      expect(() => sut.measure("a")).toThrow(uninitializedErrorMessage);
    });
    test("measure throws", () => {
      const sut = createUninitializedSUT();
      expect(() => sut.timeOrigin).toThrow(uninitializedErrorMessage);
    });
  });

  describe("timeOrigin", () => {
    test("is computed once from the runtime and cached, not recomputed on every access", () => {
      const sut = new DeterministicPerformance();
      sut.initialize(fakeRuntimeWithTimestamps([1000, 2000]));
      expect(sut.timeOrigin).toBe(1000);
      expect(sut.timeOrigin).toBe(1000);
    });
  });

  describe("now", () => {
    test("returns elapsed time since the cached time origin, not the sum", () => {
      const sut = new DeterministicPerformance();
      sut.initialize(fakeRuntimeWithTimestamps([1000, 1600]));
      expect(sut.timeOrigin).toBe(1000);
      expect(sut.now()).toBe(600);
    });
  });

  describe("measure", () => {
    test("reports the specific missing start mark in the error message", () => {
      const sut = new DeterministicPerformance();
      sut.initialize(fakeRuntimeWithTimestamps([0, 0, 0]));
      expect(() => sut.measure("m", "missing-start")).toThrow(
        "The performance mark 'missing-start' does not exist.",
      );
    });

    test("reports the specific missing options.start mark in the error message", () => {
      const sut = new DeterministicPerformance();
      sut.initialize(fakeRuntimeWithTimestamps([0, 0, 0]));
      expect(() =>
        sut.measure("m", { start: "missing-start", end: asEpochMilliseconds() }),
      ).toThrow("The performance mark 'missing-start' does not exist.");
    });

    test("reports the specific missing options.end mark in the error message", () => {
      const sut = new DeterministicPerformance();
      sut.initialize(fakeRuntimeWithTimestamps([0, 0, 0]));
      expect(() => sut.measure("m", { start: asEpochMilliseconds(), end: "missing-end" })).toThrow(
        "The performance mark 'missing-end' does not exist.",
      );
    });

    test("reports over-determined options with the specific message", () => {
      const sut = new DeterministicPerformance();
      sut.initialize(fakeRuntimeWithTimestamps([0, 0, 0]));
      expect(() =>
        sut.measure("m", {
          start: asEpochMilliseconds(),
          end: toInstant({ milliseconds: 10 }),
          duration: toDuration({ milliseconds: 10 }),
        }),
      ).toThrow("The performance measure options are over-determined");
    });

    test("reports under-determined options with the specific message", () => {
      const sut = new DeterministicPerformance();
      sut.initialize(fakeRuntimeWithTimestamps([0, 0, 0]));
      expect(() => sut.measure("m", {})).toThrow(
        "The performance measure options are under-determined",
      );
    });
  });
});
