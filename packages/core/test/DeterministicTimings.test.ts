import { describe, test, expect } from "vite-plus/test";
import { DeterministicTimings } from "../src/timings/deterministic-timings.ts";
import { toDuration, toInstant, toMonotonic } from "../src/helpers/branded-types.ts";
import type { MonotonicMilliseconds } from "../src/types/types.ts";

function clockWithReads(reads: readonly number[]) {
  let index = 0;
  return { monotonicNow: () => reads[index++] as MonotonicMilliseconds };
}

describe("DeterministicTimings", () => {
  const createSUT = () => new DeterministicTimings(clockWithReads([0, 0, 0]));

  describe("mark", () => {
    test("positions are points on the monotonic clock, not epoch timestamps", () => {
      const sut = new DeterministicTimings(clockWithReads([600]));
      const mark = sut.mark("a");
      expect(mark.startTime).toBe(600);
      // @ts-expect-error - an epoch timestamp is not a point on the monotonic clock.
      sut.mark("b", { startTime: toInstant({ milliseconds: 1 }) });
    });
  });

  describe("entries", () => {
    test("are assignable to the native entry types", () => {
      const sut = createSUT();
      const mark: PerformanceEntry = sut.mark("a", { detail: 1 });
      const measure: PerformanceEntry = sut.measure("m", { start: "a" });
      expect([mark.entryType, measure.entryType]).toEqual(["mark", "measure"]);
    });
  });

  describe("measure", () => {
    test("reports the specific missing options.start mark in the error message", () => {
      const sut = createSUT();
      expect(() => sut.measure("m", { start: "missing-start", end: toMonotonic({}) })).toThrow(
        "The mark 'missing-start' does not exist.",
      );
    });

    test("reports the specific missing options.end mark in the error message", () => {
      const sut = createSUT();
      expect(() => sut.measure("m", { start: toMonotonic({}), end: "missing-end" })).toThrow(
        "The mark 'missing-end' does not exist.",
      );
    });

    test("reports over-determined options with the specific message", () => {
      const sut = createSUT();
      expect(() =>
        sut.measure("m", {
          start: toMonotonic({}),
          end: toMonotonic({ milliseconds: 10 }),
          duration: toDuration({ milliseconds: 10 }),
        }),
      ).toThrow("The measure options are over-determined");
    });

    test("reports under-determined options with the specific message", () => {
      const sut = createSUT();
      expect(() => sut.measure("m", { duration: toDuration({ milliseconds: 10 }) })).toThrow(
        "The measure options are under-determined",
      );
    });
  });
});
