import { describe, test, expect } from "vite-plus/test";
import type { IPerformance, IScheduler } from "@time-provider/core";

type PerformanceTestSUT<TDate> = IScheduler & {
  performance: IPerformance;
  clock: { utcNow(): TDate };
};

export function testPerformance<TDate>(
  createSUT: () => PerformanceTestSUT<TDate>,
  excludeNodeSpecificBehavior: boolean = false,
) {
  /*
   * Ensure the system runtime also produce a clean SUT
   */
  const createCleanSUT = () => {
    const sut = createSUT();
    sut.performance.clearMarks();
    sut.performance.clearMeasures();
    return sut;
  };

  describe("now", () => {
    test("returns a number", () => {
      const sut = createSUT();
      expect(typeof sut.performance.now()).toBe("number");
    });

    test("is monotonically non-decreasing", () => {
      const sut = createSUT();
      const first = sut.performance.now();
      const second = sut.performance.now();
      expect(second).toBeGreaterThanOrEqual(first);
    });

    test("does not fire a pending timeout", () => {
      const sut = createCleanSUT();
      let callbackCalled = false;
      sut.setTimeout(() => (callbackCalled = true), 10);
      sut.performance.now();
      sut.performance.mark("m");
      sut.performance.measure("measure", "m");
      expect(callbackCalled).toBe(false);
    });

    test("does not fire a pending interval", () => {
      const sut = createCleanSUT();
      let callbackCalled = false;
      sut.setInterval(() => (callbackCalled = true), 10);
      sut.performance.now();
      sut.performance.mark("m");
      sut.performance.measure("measure", "m");
      expect(callbackCalled).toBe(false);
    });
  });

  describe("timeOrigin", () => {
    test("returns a number", () => {
      const sut = createSUT();
      expect(typeof sut.performance.timeOrigin).toBe("number");
    });

    test("is stable across reads", () => {
      const sut = createSUT();
      const first = sut.performance.timeOrigin;
      sut.performance.now();
      const second = sut.performance.timeOrigin;
      expect(second).toBe(first);
    });
  });

  describe("mark", () => {
    test("records an entry with the given name", () => {
      const sut = createCleanSUT();
      const mark = sut.performance.mark("a");
      expect(mark.name).toBe("a");
      expect(mark.entryType).toBe("mark");
      expect(mark.duration).toBe(0);
    });

    test("uses now() as the default startTime", () => {
      const sut = createCleanSUT();
      const before = sut.performance.now();
      const mark = sut.performance.mark("a");
      const after = sut.performance.now();
      expect(mark.startTime).toBeGreaterThanOrEqual(before);
      expect(mark.startTime).toBeLessThanOrEqual(after);
    });

    test("uses an explicit startTime when given", () => {
      const sut = createCleanSUT();
      const mark = sut.performance.mark("a", { startTime: 12345 });
      expect(mark.startTime).toBe(12345);
    });
  });

  describe("getEntries", () => {
    test("includes marks and measures", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.mark("b");
      sut.performance.measure("a-to-b", "a");
      const names = sut.performance.getEntries().map((entry) => entry.name);
      expect(names).toHaveLength(3);
      expect(names).toEqual(expect.arrayContaining(["a", "b", "a-to-b"]));
    });

    test("preserves internal entries mutability", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      const entries = sut.performance.getEntries() as unknown[];
      entries.push({});
      expect(sut.performance.getEntries()).toHaveLength(1);
    });
  });

  describe("getEntriesByName", () => {
    test("filters by name", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.mark("b");
      expect(sut.performance.getEntriesByName("a").map((entry) => entry.name)).toEqual(["a"]);
    });

    test("further filters by entryType when names collide across mark/measure", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.measure("a", "a");
      expect(sut.performance.getEntriesByName("a")).toHaveLength(2);
      expect(sut.performance.getEntriesByName("a", "mark")).toEqual([
        expect.objectContaining({ name: "a", entryType: "mark" }),
      ]);
      expect(sut.performance.getEntriesByName("a", "measure")).toEqual([
        expect.objectContaining({ name: "a", entryType: "measure" }),
      ]);
    });
  });

  describe("getEntriesByType", () => {
    test("returns only marks", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.measure("m", "a");
      expect(sut.performance.getEntriesByType("mark").map((entry) => entry.name)).toEqual(["a"]);
    });

    test("returns only measures", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.measure("m", "a");
      expect(sut.performance.getEntriesByType("measure").map((entry) => entry.name)).toEqual(["m"]);
    });
  });

  describe("clearMarks", () => {
    test("clears all marks, keeps measures", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.mark("b");
      sut.performance.measure("m", "a");
      sut.performance.clearMarks();
      expect(sut.performance.getEntriesByType("mark")).toHaveLength(0);
      expect(sut.performance.getEntriesByType("measure")).toHaveLength(1);
    });

    test("clears only the named mark", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.mark("b");
      sut.performance.clearMarks("a");
      expect(sut.performance.getEntriesByName("a")).toHaveLength(0);
      expect(sut.performance.getEntriesByName("b")).toHaveLength(1);
    });
  });

  describe("clearMeasures", () => {
    test("clears all measures, keeps marks", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.measure("m1", "a");
      sut.performance.measure("m2", "a");
      sut.performance.clearMeasures();
      expect(sut.performance.getEntriesByType("measure")).toHaveLength(0);
      expect(sut.performance.getEntriesByType("mark")).toHaveLength(1);
    });

    test("clears only the named measure", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      sut.performance.measure("m1", "a");
      sut.performance.measure("m2", "a");
      sut.performance.clearMeasures("m1");
      expect(sut.performance.getEntriesByName("m1")).toHaveLength(0);
      expect(sut.performance.getEntriesByName("m2")).toHaveLength(1);
    });
  });

  describe("measure", () => {
    test("can be called by only specifying a name", () => {
      const sut = createCleanSUT();
      expect(() => sut.performance.measure("a")).not.toThrow();
    });

    test("computes the duration from a named start mark to now", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a");
      const measure = sut.performance.measure("a-to-now", "a");
      expect(measure.name).toBe("a-to-now");
      expect(measure.entryType).toBe("measure");
      expect(measure.startTime).toBe(sut.performance.getEntriesByName("a")[0].startTime);
    });

    test("throws when the named start mark does not exist", () => {
      const sut = createCleanSUT();
      expect(() => sut.performance.measure("m", "missing")).toThrow();
    });

    test("throws when the named entry exists only as a measure, not a mark", () => {
      const sut = createCleanSUT();
      sut.performance.mark("seed");
      sut.performance.measure("x", "seed");
      expect(() => sut.performance.measure("m", "x")).toThrow();
    });

    test("computes the duration between two numeric bounds", () => {
      const sut = createCleanSUT();
      const measure = sut.performance.measure("m", { start: 10, end: 25 });
      expect(measure.startTime).toBe(10);
      expect(measure.duration).toBe(15);
    });

    test("resolves start/end options by mark name", () => {
      const sut = createCleanSUT();
      sut.performance.mark("a", { startTime: 5 });
      sut.performance.mark("b", { startTime: 20 });
      const measure = sut.performance.measure("a-to-b", { start: "a", end: "b" });
      expect(measure.startTime).toBe(5);
      expect(measure.duration).toBe(15);
    });

    test("throws when options.start names a mark that does not exist", () => {
      const sut = createCleanSUT();
      expect(() => sut.performance.measure("m", { start: "missing", end: 0 })).toThrow();
    });

    test("throws when options.end names a mark that does not exist", () => {
      const sut = createCleanSUT();
      expect(() => sut.performance.measure("m", { start: 0, end: "missing" })).toThrow();
    });

    test("computes end from start + duration", () => {
      const sut = createCleanSUT();
      const measure = sut.performance.measure("m", { start: 10, duration: 5 });
      expect(measure.startTime).toBe(10);
      expect(measure.duration).toBe(5);
    });

    test("computes start from end - duration", () => {
      const sut = createCleanSUT();
      const measure = sut.performance.measure("m", { end: 100, duration: 5 });
      expect(measure.startTime).toBe(95);
      expect(measure.duration).toBe(5);
    });

    test("throws when start, end and duration are all given", () => {
      const sut = createCleanSUT();
      expect(() => sut.performance.measure("m", { start: 0, end: 10, duration: 10 })).toThrow(
        TypeError,
      );
    });

    if (excludeNodeSpecificBehavior) {
      test.each([{}, { detail: "x" }])(
        "does not throw when neither start nor end are given (%j)",
        (options) => {
          const sut = createCleanSUT();
          expect(() => sut.performance.measure("m", options)).not.toThrow(TypeError);
        },
      );
    } else {
      test.each([{}, { detail: "x" }])(
        "throws when neither start nor end are given (%j)",
        (options) => {
          const sut = createCleanSUT();
          expect(() => sut.performance.measure("m", options)).toThrow(TypeError);
        },
      );
    }
  });
}
