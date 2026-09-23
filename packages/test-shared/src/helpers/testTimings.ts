import { describe, test, expect } from "vite-plus/test";
import {
  toDuration,
  toMonotonic,
  type EpochMilliseconds,
  type ITimers,
  type ITimings,
  type MonotonicMilliseconds,
} from "@time-provider/core";

type TimingsTestSUT<TDate> = ITimers & {
  timings: ITimings;
  clock: {
    utcNow(): TDate;
    monotonicNow(): MonotonicMilliseconds;
    readonly monotonicOrigin: EpochMilliseconds;
  };
};

export function testMonotonicClock<TDate>(createSUT: () => TimingsTestSUT<TDate>) {
  describe("monotonicNow", () => {
    test("returns a number", () => {
      const sut = createSUT();
      expect(typeof sut.clock.monotonicNow()).toBe("number");
    });

    test("is monotonically non-decreasing", () => {
      const sut = createSUT();
      const first = sut.clock.monotonicNow();
      const second = sut.clock.monotonicNow();
      expect(second).toBeGreaterThanOrEqual(first);
    });

    test("does not fire a pending timeout", () => {
      const sut = createSUT();
      let callbackCalled = false;
      sut.once({ milliseconds: 10 }, () => (callbackCalled = true));
      sut.clock.monotonicNow();
      expect(callbackCalled).toBe(false);
    });

    test("does not fire a pending interval", () => {
      const sut = createSUT();
      let callbackCalled = false;
      sut.every({ milliseconds: 10 }, () => (callbackCalled = true));
      sut.clock.monotonicNow();
      expect(callbackCalled).toBe(false);
    });
  });

  describe("monotonicOrigin", () => {
    test("returns a number", () => {
      const sut = createSUT();
      expect(typeof sut.clock.monotonicOrigin).toBe("number");
    });

    test("is stable across reads", () => {
      const sut = createSUT();
      const first = sut.clock.monotonicOrigin;
      sut.clock.monotonicNow();
      const second = sut.clock.monotonicOrigin;
      expect(second).toBe(first);
    });
  });
}

export function testTimings<TDate>(createSUT: () => TimingsTestSUT<TDate>) {
  /*
   * Ensure the system runtime also produce a clean SUT
   */
  const createCleanSUT = () => {
    const sut = createSUT();
    sut.timings.clear();
    return sut;
  };

  test("does not fire a pending timer", () => {
    const sut = createCleanSUT();
    let callbackCalled = false;
    sut.once({ milliseconds: 10 }, () => (callbackCalled = true));
    sut.every({ milliseconds: 10 }, () => (callbackCalled = true));
    sut.timings.mark("m");
    sut.timings.measure("measure", { start: "m" });
    sut.timings.entries();
    sut.timings.clear();
    expect(callbackCalled).toBe(false);
  });

  describe("mark", () => {
    test("records an entry with the given name", () => {
      const sut = createCleanSUT();
      const mark = sut.timings.mark("a");
      expect(mark.name).toBe("a");
      expect(mark.entryType).toBe("mark");
      expect(mark.duration).toBe(0);
    });

    test("uses monotonicNow() as the default startTime", () => {
      const sut = createCleanSUT();
      const before = sut.clock.monotonicNow();
      const mark = sut.timings.mark("a");
      const after = sut.clock.monotonicNow();
      expect(mark.startTime).toBeGreaterThanOrEqual(before);
      expect(mark.startTime).toBeLessThanOrEqual(after);
    });

    test("uses an explicit startTime when given", () => {
      const sut = createCleanSUT();
      const mark = sut.timings.mark("a", { startTime: toMonotonic({ milliseconds: 12345 }) });
      expect(mark.startTime).toBe(12345);
    });
  });

  describe("detail", () => {
    test("is kept on a mark", () => {
      const sut = createCleanSUT();
      expect(sut.timings.mark("a", { detail: { step: 1 } }).detail).toEqual({ step: 1 });
    });

    test("is kept on a measure", () => {
      const sut = createCleanSUT();
      sut.timings.mark("a");
      expect(sut.timings.measure("m", { start: "a", detail: "x" }).detail).toBe("x");
    });

    test("defaults to null", () => {
      const sut = createCleanSUT();
      expect(sut.timings.mark("a").detail).toBeNull();
      expect(sut.timings.measure("m").detail).toBeNull();
    });
  });

  describe("toJSON", () => {
    test("serializes a mark to its plain fields", () => {
      const sut = createCleanSUT();
      const mark = sut.timings.mark("a", {
        startTime: toMonotonic({ milliseconds: 5 }),
        detail: 1,
      });
      expect(JSON.parse(JSON.stringify(mark))).toEqual({
        name: "a",
        entryType: "mark",
        startTime: 5,
        duration: 0,
        detail: 1,
      });
    });

    test("serializes a measure to its plain fields", () => {
      const sut = createCleanSUT();
      const measure = sut.timings.measure("m", {
        start: toMonotonic({ milliseconds: 10 }),
        end: toMonotonic({ milliseconds: 25 }),
      });
      expect(JSON.parse(JSON.stringify(measure))).toEqual({
        name: "m",
        entryType: "measure",
        startTime: 10,
        duration: 15,
        detail: null,
      });
    });
  });

  describe("entries", () => {
    const recordSome = () => {
      const sut = createCleanSUT();
      sut.timings.mark("a");
      sut.timings.mark("b");
      sut.timings.measure("a", { start: "a" });
      return sut;
    };

    test("lists every mark and measure without a filter", () => {
      const names = recordSome()
        .timings.entries()
        .map((entry) => `${entry.entryType}:${entry.name}`);
      expect(names).toHaveLength(3);
      expect(names).toEqual(expect.arrayContaining(["mark:a", "mark:b", "measure:a"]));
    });

    test("filters by name", () => {
      const entries = recordSome().timings.entries({ name: "a" });
      expect(entries.map((entry) => entry.entryType).toSorted()).toEqual(["mark", "measure"]);
    });

    test("filters by kind", () => {
      const sut = recordSome();
      expect(sut.timings.entries({ kind: "mark" }).map((entry) => entry.name)).toEqual(["a", "b"]);
      expect(sut.timings.entries({ kind: "measure" }).map((entry) => entry.name)).toEqual(["a"]);
    });

    test("filters by name and kind", () => {
      expect(recordSome().timings.entries({ name: "a", kind: "measure" })).toEqual([
        expect.objectContaining({ name: "a", entryType: "measure" }),
      ]);
    });

    test("preserves internal entries mutability", () => {
      const sut = createCleanSUT();
      sut.timings.mark("a");
      const entries = sut.timings.entries() as unknown[];
      entries.push({});
      expect(sut.timings.entries()).toHaveLength(1);
    });
  });

  describe("clear", () => {
    const recordSome = () => {
      const sut = createCleanSUT();
      sut.timings.mark("a");
      sut.timings.mark("b");
      sut.timings.measure("a", { start: "a" });
      sut.timings.measure("b", { start: "a" });
      return sut;
    };

    test.each([
      [{}],
      [{ name: "a" }],
      [{ kind: "mark" as const }],
      [{ kind: "measure" as const }],
      [{ name: "a", kind: "mark" as const }],
      [{ name: "b", kind: "measure" as const }],
    ])("removes exactly what entries() returns for %j", (filter) => {
      const key = (entry: { entryType: string; name: string }) =>
        `${entry.entryType}:${entry.name}`;
      const sut = recordSome();
      const removed = sut.timings.entries(filter).map(key);
      const expected = sut.timings
        .entries()
        .map(key)
        .filter((entry) => !removed.includes(entry));
      sut.timings.clear(filter);
      expect(removed).not.toHaveLength(0);
      expect(sut.timings.entries().map(key)).toEqual(expected);
    });

    test("removes everything without a filter", () => {
      const sut = recordSome();
      sut.timings.clear();
      expect(sut.timings.entries()).toHaveLength(0);
    });
  });

  describe("measure", () => {
    test("runs from the origin to now when given only a name", () => {
      const sut = createCleanSUT();
      const before = sut.clock.monotonicNow();
      const measure = sut.timings.measure("m");
      const after = sut.clock.monotonicNow();
      expect(measure.name).toBe("m");
      expect(measure.entryType).toBe("measure");
      expect(measure.startTime).toBe(0);
      expect(measure.duration).toBeGreaterThanOrEqual(before);
      expect(measure.duration).toBeLessThanOrEqual(after);
    });

    test.each([{}, { detail: "x" }])("runs from the origin when given %j", (options) => {
      const sut = createCleanSUT();
      expect(sut.timings.measure("m", options).startTime).toBe(0);
    });

    test("computes the duration from a named start mark to now", () => {
      const sut = createCleanSUT();
      const mark = sut.timings.mark("a");
      const measure = sut.timings.measure("a-to-now", { start: "a" });
      expect(measure.startTime).toBe(mark.startTime);
    });

    test("throws when the named entry exists only as a measure, not a mark", () => {
      const sut = createCleanSUT();
      sut.timings.mark("seed");
      sut.timings.measure("x", { start: "seed" });
      expect(() => sut.timings.measure("m", { start: "x" })).toThrow();
    });

    test("computes the duration between two numeric bounds", () => {
      const sut = createCleanSUT();
      const measure = sut.timings.measure("m", {
        start: toMonotonic({ milliseconds: 10 }),
        end: toMonotonic({ milliseconds: 25 }),
      });
      expect(measure.startTime).toBe(10);
      expect(measure.duration).toBe(15);
    });

    test("resolves start/end options by mark name", () => {
      const sut = createCleanSUT();
      sut.timings.mark("a", { startTime: toMonotonic({ milliseconds: 5 }) });
      sut.timings.mark("b", { startTime: toMonotonic({ milliseconds: 20 }) });
      const measure = sut.timings.measure("a-to-b", { start: "a", end: "b" });
      expect(measure.startTime).toBe(5);
      expect(measure.duration).toBe(15);
    });

    test("throws when options.start names a mark that does not exist", () => {
      const sut = createCleanSUT();
      expect(() => sut.timings.measure("m", { start: "missing", end: toMonotonic({}) })).toThrow();
    });

    test("throws when options.end names a mark that does not exist", () => {
      const sut = createCleanSUT();
      expect(() => sut.timings.measure("m", { start: toMonotonic({}), end: "missing" })).toThrow();
    });

    test("computes end from start + duration", () => {
      const sut = createCleanSUT();
      const measure = sut.timings.measure("m", {
        start: toMonotonic({ milliseconds: 10 }),
        duration: toDuration({ milliseconds: 5 }),
      });
      expect(measure.startTime).toBe(10);
      expect(measure.duration).toBe(5);
    });

    test("computes start from end - duration", () => {
      const sut = createCleanSUT();
      const measure = sut.timings.measure("m", {
        end: toMonotonic({ milliseconds: 100 }),
        duration: toDuration({ milliseconds: 5 }),
      });
      expect(measure.startTime).toBe(95);
      expect(measure.duration).toBe(5);
    });

    test("throws when start, end and duration are all given", () => {
      const sut = createCleanSUT();
      expect(() =>
        sut.timings.measure("m", {
          start: toMonotonic({}),
          end: toMonotonic({ milliseconds: 10 }),
          duration: toDuration({ milliseconds: 10 }),
        }),
      ).toThrow(TypeError);
    });

    test("throws when duration is given without start or end", () => {
      const sut = createCleanSUT();
      expect(() =>
        sut.timings.measure("m", { duration: toDuration({ milliseconds: 10 }) }),
      ).toThrow(TypeError);
    });
  });
}
