import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { BaseManualRuntime } from "@time-provider/core/deterministic";
import type { ITimerHandle, ITimeConverter } from "@time-provider/core";
import { toInstant } from "../src/helpers/branded-types.ts";

const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => toInstant({ milliseconds: Number(time) }),
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
      const handles: ITimerHandle[] = uniqueDelays.map((delay) =>
        sut.timers.once({ milliseconds: delay }, () => fired.push(delay)),
      );

      // Cancel roughly a third of them, scattered across the whole insertion order (and so
      // across the whole heap array, not clustered near the end).
      const cancelledIndices = handles
        .map((_, i) => i)
        .filter((_i) => Math.floor(random() * 3) === 0);
      for (const i of cancelledIndices) {
        handles[i].dispose();
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
    const root = sut.timers.once({ milliseconds: 1 }, () => fired.push("a"));
    sut.timers.once({ milliseconds: 100 }, () => fired.push("b"));
    sut.timers.once({ milliseconds: 50 }, () => fired.push("c"));

    // "a" is the earliest-due entry (heap root) at the moment it's cleared, with two other
    // entries still pending - unlike clearing a non-root entry, there's no parent to compare
    // the replacement against here.
    root.dispose();

    sut.advance({ milliseconds: 100 });
    expect(fired).toEqual(["c", "b"]);
  });

  test("clearing the root when other entries share its runAt exercises the siftDown tie-break", () => {
    const sut = new FakeManualRuntime(0);
    const fired: number[] = [];
    const makeTimeout = (id: number) =>
      sut.timers.once({ milliseconds: 100 }, () => fired.push(id));

    const root = makeTimeout(0);
    const toClear = makeTimeout(1);
    makeTimeout(2);
    makeTimeout(3);
    toClear.dispose();
    makeTimeout(10);
    makeTimeout(11);
    // "0" is still the root (smallest seq among entries sharing runAt 100) when cleared, with
    // several same-runAt siblings left - the resulting re-seat has to compare same-runAt
    // children by seq to find which one moves up.
    root.dispose();

    sut.advance({ milliseconds: 100 });
    expect(fired).toEqual([2, 3, 10, 11]);
  });
});

describe("issue#147", () => {
  describe("BaseManualRuntime advance() with self-rescheduling due entries", () => {
    /*
     * A callback that re-registers itself via scheduler.setTimeout when it runs. A self-rescheduling entry's
     * new registration can't cap the whole chain to exactly one fire per advance() call, however large the jump.
     */
    function selfReschedulingChain(
      sut: FakeManualRuntime,
      delay: number,
    ): { fireCount: () => number } {
      let fires = 0;
      function tick() {
        fires++;
        sut.timers.once({ milliseconds: delay }, tick);
      }
      sut.timers.once({ milliseconds: delay }, tick);
      return { fireCount: () => fires };
    }

    test("fires once per delay across a single large advance(), not once total", () => {
      const sut = new FakeManualRuntime(0);
      const delay = 1000 / 60;
      const chain = selfReschedulingChain(sut, delay);

      sut.advance({ milliseconds: 1000 });

      expect(chain.fireCount()).toBe(60);
    });

    test("gives the same total fire count whether advanced in one jump or several smaller ones", () => {
      const sut = new FakeManualRuntime(0);
      const delay = 1000 / 60;
      const chain = selfReschedulingChain(sut, delay);

      for (let i = 0; i < 5; i++) sut.advance({ milliseconds: 200 });

      expect(chain.fireCount()).toBe(60);
    });

    test("still lands exactly on the requested target when nothing is due", () => {
      const sut = new FakeManualRuntime(0);
      sut.advance({ milliseconds: 1000 });
      expect(sut.timestampNow()).toBe(1000);
    });

    test("a plain setInterval is unaffected (control case)", () => {
      const sut = new FakeManualRuntime(0);
      let fires = 0;
      const delay = 1000 / 60;
      sut.timers.every({ milliseconds: delay }, () => fires++);

      sut.advance({ milliseconds: 1000 });

      expect(fires).toBe(60);
    });
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
      sut.timers.once({ milliseconds: 10 }, () => {
        throw error;
      });
      sut.timers.once({ milliseconds: 20 }, () => (otherFired = true));

      expect(() => sut.advance({ milliseconds: 20 })).toThrow(error);
      expect(otherFired).toBe(false);
    });

    test("a throwing setInterval callback rethrows, but is still armed for its next tick since re-arming happens before the callback runs", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let intervalFires = 0;
      let otherFired = false;
      const error = new Error("boom");
      sut.timers.every({ milliseconds: 10 }, () => {
        intervalFires++;
        throw error;
      });
      sut.timers.once({ milliseconds: 15 }, () => (otherFired = true));

      // Due at 10 within this batch - throws immediately, stopping before the timeout due at 15
      // ever gets a turn.
      expect(() => sut.advance({ milliseconds: 25 })).toThrow(error);
      expect(intervalFires).toBe(1);
      expect(otherFired).toBe(false);
      expect(sut.timestampNow()).toBe(10);

      expect(() => sut.advance({ milliseconds: 15 })).toThrow(error);
      expect(intervalFires).toBe(2);
      expect(otherFired).toBe(true);
    });

    test("a throwing setRecurring callback rethrows and doesn't re-arm (same as returning false)", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let recurringFires = 0;
      let otherFired = false;
      const error = new Error("boom");
      sut.timers.recurring(
        () => {
          recurringFires++;
          throw error;
        },
        { milliseconds: 10 },
      );
      sut.timers.once({ milliseconds: 15 }, () => (otherFired = true));

      expect(() => sut.advance({ milliseconds: 25 })).toThrow(error);
      expect(recurringFires).toBe(1);
      expect(otherFired).toBe(false);
      expect(sut.timestampNow()).toBe(10);

      expect(() => sut.advance({ milliseconds: 15 })).not.toThrow();
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
      sut.timers.once({ milliseconds: 10 }, () => {
        throw error;
      });
      sut.timers.once({ milliseconds: 20 }, () => (otherFired = true));

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
      sut.timers.every({ milliseconds: 10 }, () => {
        intervalFires++;
        throw error;
      });
      sut.timers.once({ milliseconds: 15 }, () => (otherFired = true));

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
      sut.timers.recurring(
        () => {
          recurringFires++;
          throw error;
        },
        { milliseconds: 10 },
      );
      sut.timers.once({ milliseconds: 15 }, () => (otherFired = true));

      expect(() => sut.advance({ milliseconds: 25 })).not.toThrow();
      expect(recurringFires).toBe(1); // never re-armed after throwing once
      expect(otherFired).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe("clearTimer", () => {
    test("does not throw when trying to clear a undefined native handle value", () => {
      expect(() => {
        const sut = new FakeManualRuntime(0);
        //@ts-ignore : wrong cast
        sut.clearTimer({ nativeHandle: undefined } as TimerHandle<unknown, unknown>);
      }).not.toThrow();
    });
  });
});
