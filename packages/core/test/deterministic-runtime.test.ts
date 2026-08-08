import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { BaseManualRuntime } from "@time-provider/core/deterministic";
import type { DueHandle, ITimeConverter } from "@time-provider/core";

const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => Number(time),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};

class FakeManualRuntime extends BaseManualRuntime<number> {
  constructor(initialTime: number) {
    super("Etc/UTC", initialTime, identityConverter);
  }
  protected advanceYears(time: number, years: number): number {
    return time + years * 365 * 24 * 60 * 60 * 1000;
  }
  protected advanceMonths(time: number, months: number): number {
    return time + months * 30 * 24 * 60 * 60 * 1000;
  }
  protected advanceDays(time: number, days: number): number {
    return time + days * 24 * 60 * 60 * 1000;
  }
  protected advanceHours(time: number, hours: number): number {
    return time + hours * 60 * 60 * 1000;
  }
  protected advanceMinutes(time: number, minutes: number): number {
    return time + minutes * 60 * 1000;
  }
  protected advanceSeconds(time: number, seconds: number): number {
    return time + seconds * 1000;
  }
  protected advanceMilliseconds(time: number, milliseconds: number): number {
    return time + milliseconds;
  }
}

describe("BaseManualRuntime scheduling (heap internals)", () => {
  /** A cheap deterministic pseudo-random PRNG (mulberry32) generator to mimic delays induced by real scheduler calls */
  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  test.each([1, 2, 3, 4, 5])(
    "cancelling scattered timers (seed %i) still fires the rest in chronological order",
    (seed) => {
      const random = mulberry32(seed);
      const count = 40;
      const delays = Array.from({ length: count }, () => 1 + Math.floor(random() * 10000));
      // Distinct delays keep the expected firing order unambiguous (no same-runAt tie-breaking).
      const uniqueDelays = [...new Set(delays)];

      const sut = new FakeManualRuntime(0);
      const fired: number[] = [];
      const handles: DueHandle[] = uniqueDelays.map((delay) =>
        sut.scheduler.setTimeout(() => fired.push(delay), delay),
      );

      // Cancel roughly a third of them, scattered across the whole insertion order (and so
      // across the whole heap array, not clustered near the end).
      const cancelledIndices = handles
        .map((_, i) => i)
        .filter((_i) => Math.floor(random() * 3) === 0);
      for (const i of cancelledIndices) {
        sut.scheduler.clearTimeout(handles[i]);
      }

      sut.advance({ milliseconds: 20000 });

      const cancelled = new Set(cancelledIndices.map((i) => uniqueDelays[i]));
      const expected = uniqueDelays
        .filter((delay) => !cancelled.has(delay))
        .toSorted((a, b) => a - b);
      expect(fired).toEqual(expected);
    },
  );

  test("clearing the current root while other entries remain re-seats the heap from a leaf", () => {
    const sut = new FakeManualRuntime(0);
    const fired: string[] = [];
    const root = sut.scheduler.setTimeout(() => fired.push("a"), 1);
    sut.scheduler.setTimeout(() => fired.push("b"), 100);
    sut.scheduler.setTimeout(() => fired.push("c"), 50);

    // "a" is the earliest-due entry (heap root) at the moment it's cleared, with two other
    // entries still pending - unlike clearing a non-root entry, there's no parent to compare
    // the replacement against here.
    sut.scheduler.clearTimeout(root);

    sut.advance({ milliseconds: 100 });
    expect(fired).toEqual(["c", "b"]);
  });

  test("clearing the root when other entries share its runAt exercises the siftDown tie-break", () => {
    const sut = new FakeManualRuntime(0);
    const fired: number[] = [];
    const makeTimeout = (id: number) => sut.scheduler.setTimeout(() => fired.push(id), 100);

    const root = makeTimeout(0);
    const toClear = makeTimeout(1);
    makeTimeout(2);
    makeTimeout(3);
    sut.scheduler.clearTimeout(toClear);
    makeTimeout(10);
    makeTimeout(11);
    // "0" is still the root (smallest seq among entries sharing runAt 100) when cleared, with
    // several same-runAt siblings left - the resulting re-seat has to compare same-runAt
    // children by seq to find which one moves up.
    sut.scheduler.clearTimeout(root);

    sut.advance({ milliseconds: 100 });
    expect(fired).toEqual([2, 3, 10, 11]);
  });
});

describe("BaseManualRuntime drainDue exception handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("in a Node-like environment (rethrows, matching a real Node timer callback's fatal default)", () => {
    function stubNodeLike(): void {
      vi.stubGlobal("window", undefined);
      vi.stubGlobal("process", { versions: { node: "20.11.0" } });
    }

    test("a throwing setTimeout callback rethrows synchronously and stops the rest of that batch", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let otherFired = false;
      const error = new Error("boom");
      sut.scheduler.setTimeout(() => {
        throw error;
      }, 10);
      sut.scheduler.setTimeout(() => (otherFired = true), 20);

      expect(() => sut.advance({ milliseconds: 20 })).toThrow(error);
      expect(otherFired).toBe(false);
    });

    test("a throwing setInterval callback rethrows, but is still armed for its next tick since re-arming happens before the callback runs", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let intervalFires = 0;
      let otherFired = false;
      const error = new Error("boom");
      sut.scheduler.setInterval(() => {
        intervalFires++;
        throw error;
      }, 10);
      sut.scheduler.setTimeout(() => (otherFired = true), 15);

      // Due at 10 within this batch - throws immediately, stopping before the timeout due at 15
      // ever gets a turn.
      expect(() => sut.advance({ milliseconds: 25 })).toThrow(error);
      expect(intervalFires).toBe(1);
      expect(otherFired).toBe(false);

      // Nothing was lost: the interval's next tick (already re-armed for 20) and the still-due
      // timeout at 15 are both still pending, and draining resumes on the next call.
      expect(() => sut.advance({})).toThrow(error);
      expect(intervalFires).toBe(2);
      expect(otherFired).toBe(true);
    });

    test("a throwing setRecurring callback rethrows and doesn't re-arm (same as returning false)", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let recurringFires = 0;
      let otherFired = false;
      const error = new Error("boom");
      sut.scheduler.setRecurring(() => {
        recurringFires++;
        throw error;
      }, 10);
      sut.scheduler.setTimeout(() => (otherFired = true), 15);

      expect(() => sut.advance({ milliseconds: 25 })).toThrow(error);
      expect(recurringFires).toBe(1);
      expect(otherFired).toBe(false);

      // The recurring schedule never re-armed, so draining what's left only runs the timeout.
      expect(() => sut.advance({})).not.toThrow();
      expect(recurringFires).toBe(1);
      expect(otherFired).toBe(true);
    });
  });

  describe("in a browser-like environment (logs via console.error and keeps going, matching a browser's non-fatal default)", () => {
    function stubBrowserLike(): void {
      vi.stubGlobal("window", {});
      vi.stubGlobal("process", undefined);
    }

    test("a throwing setTimeout callback doesn't block another due timeout in the same batch", () => {
      stubBrowserLike();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const sut = new FakeManualRuntime(0);
      let otherFired = false;
      const error = new Error("boom");
      sut.scheduler.setTimeout(() => {
        throw error;
      }, 10);
      sut.scheduler.setTimeout(() => (otherFired = true), 20);

      expect(() => sut.advance({ milliseconds: 20 })).not.toThrow();
      expect(otherFired).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });

    test("a throwing setInterval callback still re-arms for its next tick, and doesn't block others", () => {
      stubBrowserLike();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const sut = new FakeManualRuntime(0);
      let intervalFires = 0;
      let otherFired = false;
      const error = new Error("boom");
      sut.scheduler.setInterval(() => {
        intervalFires++;
        throw error;
      }, 10);
      sut.scheduler.setTimeout(() => (otherFired = true), 15);

      // Due at both 10 and 20 within the advance() below - throws twice, logged each time, and
      // the whole batch (including the unrelated timeout due at 15) still runs to completion.
      expect(() => sut.advance({ milliseconds: 25 })).not.toThrow();
      expect(intervalFires).toBe(2);
      expect(otherFired).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, error);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, error);
    });

    test("a throwing setRecurring callback doesn't re-arm (same as returning false), and doesn't block others", () => {
      stubBrowserLike();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const sut = new FakeManualRuntime(0);
      let recurringFires = 0;
      let otherFired = false;
      const error = new Error("boom");
      sut.scheduler.setRecurring(() => {
        recurringFires++;
        throw error;
      }, 10);
      sut.scheduler.setTimeout(() => (otherFired = true), 15);

      expect(() => sut.advance({ milliseconds: 25 })).not.toThrow();
      expect(recurringFires).toBe(1); // never re-armed after throwing once
      expect(otherFired).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });
  });
});

describe("BaseDeterministicRuntime clearDueHandle", () => {
  test("clearInterval does not cancel a timeout scheduled with the same runtime", () => {
    const sut = new FakeManualRuntime(0);
    let timeoutFired = false;
    const timeoutHandle = sut.scheduler.setTimeout(() => (timeoutFired = true), 10);

    sut.scheduler.clearInterval(timeoutHandle);
    sut.advance({ milliseconds: 10 });

    expect(timeoutFired).toBe(true);
  });

  test("clearTimeout does not cancel an interval scheduled with the same runtime", () => {
    const sut = new FakeManualRuntime(0);
    let intervalFireCount = 0;
    const intervalHandle = sut.scheduler.setInterval(() => intervalFireCount++, 10);

    sut.scheduler.clearTimeout(intervalHandle);
    sut.advance({ milliseconds: 10 });

    expect(intervalFireCount).toBe(1);
  });
});
