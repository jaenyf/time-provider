import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { BaseManualRuntime } from "../src/runtimes/deterministic-runtime.ts";
import type { IScheduledHandle, ITimeConverter } from "../src/types/types.ts";
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
      const handles: IScheduledHandle[] = uniqueDelays.map((delay) =>
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
     * A callback that re-arm itself via another timer programming when it runs.
     * A self-rearming entry's new registration can't cap the whole chain to exactly one fire per advance() call, however large the jump.
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

    test("a plain every timer call is unaffected (control case)", () => {
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

    test("a throwing every timer callback rethrows, but is still armed for its next tick since re-arming happens before the callback runs", () => {
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

    test("a throwing microtask rethrows, and never runs again on a later checkpoint", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      const log: string[] = [];
      const error = new Error("boom");
      sut.microtasks.queue(() => {
        log.push("throwing");
        throw error;
      });
      sut.microtasks.queue(() => log.push("after"));

      // The checkpoint stops where it threw, exactly as a due callback batch does.
      expect(() => sut.microtasks.drain()).toThrow(error);
      expect(log).toEqual(["throwing"]);

      // The one that threw already ran, so only what is genuinely still pending resumes.
      expect(() => sut.microtasks.drain()).not.toThrow();
      expect(log).toEqual(["throwing", "after"]);
    });

    test("a throwing due callback still leaves its microtask checkpoint owed", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      const log: string[] = [];
      const error = new Error("boom");
      sut.timers.once({ milliseconds: 10 }, () => {
        sut.microtasks.queue(() => log.push("microtask"));
        throw error;
      });

      expect(() => sut.advance({ milliseconds: 10 })).toThrow(error);
      expect(log).toEqual(["microtask"]);
    });

    test("a microtask that schedules a timer doesn't re-run itself (checkpoint reentrancy)", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let runCount = 0;
      sut.microtasks.queue(() => {
        runCount++;
        // Scheduling a timer runs mayRunDueCallbacks, which would restart the checkpoint on the
        // same, not-yet-cleared queue without the reentrancy guard.
        sut.timers.once({ milliseconds: 1000 }, () => {});
      });

      sut.microtasks.drain();

      expect(runCount).toBe(1);
    });

    test("a microtask that reads the clock doesn't re-run itself (checkpoint reentrancy)", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let runCount = 0;
      sut.microtasks.queue(() => {
        runCount++;
        // A sequential/manual clock read also runs mayRunDueCallbacks.
        sut.clock.utcNow();
      });

      sut.microtasks.drain();

      expect(runCount).toBe(1);
    });

    test("a microtask queued by a due callback and reading the clock doesn't re-run itself", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let runCount = 0;
      sut.timers.once({ milliseconds: 10 }, () => {
        sut.microtasks.queue(() => {
          runCount++;
          sut.clock.utcNow();
        });
      });

      sut.advance({ milliseconds: 10 });

      expect(runCount).toBe(1);
    });

    test("a microtask queued during a nested checkpoint attempt still runs, in the same drain", () => {
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      const log: string[] = [];
      sut.microtasks.queue(() => {
        log.push("m1");
        // The nested checkpoint this triggers is a no-op, but m2 must still be picked up by the
        // outer, still-running checkpoint loop.
        sut.timers.once({ milliseconds: 1000 }, () => {});
        sut.microtasks.queue(() => log.push("m2"));
      });

      sut.microtasks.drain();

      expect(log).toEqual(["m1", "m2"]);
    });

    test("a due callback's microtasks run before the next due callback sharing its runAt", () => {
      // Both timers are already due by the time either runs - a single advance() call fires them
      // both from the same drainDue batch, unlike two separate once() calls (each of which gets
      // its own mayRunDueCallbacks turn regardless of how the checkpoint is placed). Only a
      // per-callback checkpoint inside that shared batch gets this order right.
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      const log: string[] = [];
      sut.timers.once({ milliseconds: 5 }, () => {
        log.push("t1");
        sut.microtasks.queue(() => log.push("m1"));
      });
      sut.timers.once({ milliseconds: 5 }, () => log.push("t2"));

      sut.advance({ milliseconds: 5 });

      expect(log).toEqual(["t1", "m1", "t2"]);
    });

    test("a due callback's microtasks run before the next due callback at a later runAt, within the same advance()", () => {
      // Same point as above, but the two due callbacks land at different runAt values within one
      // advance() walk (drainDueAdvancing's own loop over several drainDue calls), rather than
      // sharing a single drainDue batch.
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      const log: string[] = [];
      sut.timers.once({ milliseconds: 5 }, () => {
        log.push("t1");
        sut.microtasks.queue(() => log.push("m1"));
      });
      sut.timers.once({ milliseconds: 10 }, () => log.push("t2"));

      sut.advance({ milliseconds: 15 });

      expect(log).toEqual(["t1", "m1", "t2"]);
    });

    test("advance() drains pending microtasks even when nothing ends up due", () => {
      // advance() reaches drainDueAdvancing directly, bypassing mayRunDueCallbacks - so unlike a
      // once()/every()/recurring() call, it has no pre-checkpoint of its own by default.
      // drainDueAdvancing's loop only checkpoints as a side effect of a due callback actually
      // running, so with nothing due at all it would never run one without an explicit guard.
      stubNodeLike();
      const sut = new FakeManualRuntime(0);
      let ran = false;
      sut.microtasks.queue(() => (ran = true));

      sut.advance({ milliseconds: 100 });

      expect(ran).toBe(true);
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

    test("a throwing microtask is logged and doesn't block the rest of the checkpoint", () => {
      stubBrowserLike();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const sut = new FakeManualRuntime(0);
      const log: string[] = [];
      const error = new Error("boom");
      sut.microtasks.queue(() => {
        throw error;
      });
      sut.microtasks.queue(() => log.push("after"));

      expect(() => sut.microtasks.drain()).not.toThrow();
      expect(log).toEqual(["after"]);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });

    test("a throwing every timer callback still re-arms for its next tick, and doesn't block others", () => {
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

describe("BaseManualRuntime timer handle signal/dispose", () => {
  test("signal is not aborted by default", () => {
    const sut = new FakeManualRuntime(0);
    const handle = sut.timers.once({ milliseconds: 100 }, () => {});
    expect(handle.signal.aborted).toBe(false);
  });

  test("signal is already aborted for a handle disposed before signal was ever accessed", () => {
    const sut = new FakeManualRuntime(0);
    const handle = sut.timers.once({ milliseconds: 100 }, () => {});
    handle.dispose();
    expect(handle.signal.aborted).toBe(true);
  });

  test("accessing signal a second time returns the same signal instead of recreating it", () => {
    const sut = new FakeManualRuntime(0);
    const handle = sut.timers.once({ milliseconds: 100 }, () => {});
    expect(handle.signal).toBe(handle.signal);
  });

  test("dispatching abort on a lazily-created signal disposes the handle", () => {
    const sut = new FakeManualRuntime(0);
    const handle = sut.timers.once({ milliseconds: 100 }, () => {});
    handle.signal.dispatchEvent(new Event("abort"));
    expect(handle.isDisposed).toBe(true);
  });

  test("disposing a handle after its signal was accessed still disposes it, and leaves other live handles reachable", () => {
    // Regression test: dispose() aborting this handle's own AbortController re-enters dispose()
    // synchronously through the "abort" listener signal wires up. If dispose() didn't guard against
    // that reentrant call before reaching the heap's live-entry list, the second (redundant) unlink
    // corrupted the list, silently orphaning any other live entry from runtime.dispose()'s sweep.
    const sut = new FakeManualRuntime(0);
    const a = sut.timers.once({ milliseconds: 100 }, () => {});
    const b = sut.timers.once({ milliseconds: 200 }, () => {});
    const lazyLoad = a.signal; // trigger the lazy load
    a.dispose();
    expect(lazyLoad).not.toBe(undefined);
    expect(a.isDisposed).toBe(true);

    sut.dispose();
    expect(b.isDisposed).toBe(true);
  });
});

describe("BaseManualRuntime tagged timers", () => {
  test("register() does not run the callback in-line", () => {
    const sut = new FakeManualRuntime(0);
    let called = false;
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => (called = true));
    expect(called).toBe(false);
  });

  test("register() clamps a negative delay to 0, same as once() - already due, so it fires in-line", () => {
    const sut = new FakeManualRuntime(0);
    let called = false;
    sut.taggedTimers.register("tag", { milliseconds: -100 }, () => (called = true));
    expect(called).toBe(true);
  });

  test("take() removes and returns the callback, oldest first", () => {
    const sut = new FakeManualRuntime(0);
    const order: number[] = [];
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(1));
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(2));
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(3));

    const callbacks = sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY);
    for (const callback of callbacks) callback();

    expect(order).toEqual([1, 2, 3]);
  });

  test("take() honors maxCount, leaving the remainder for a later take", () => {
    const sut = new FakeManualRuntime(0);
    const order: number[] = [];
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(1));
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(2));
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(3));

    for (const callback of sut.taggedTimers.take("tag", 2)) callback();
    expect(order).toEqual([1, 2]);

    for (const callback of sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)) callback();
    expect(order).toEqual([1, 2, 3]);
  });

  test("take() with nothing registered under the tag returns an empty array", () => {
    const sut = new FakeManualRuntime(0);
    expect(sut.taggedTimers.take("never-registered", 10)).toEqual([]);
  });

  test("take() from a tag that's been fully drained already returns an empty array", () => {
    const sut = new FakeManualRuntime(0);
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => {});
    sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY);
    expect(sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)).toEqual([]);
  });

  test("different tags are fully isolated from each other", () => {
    const sut = new FakeManualRuntime(0);
    let aCalled = false;
    let bCalled = false;
    sut.taggedTimers.register("a", { milliseconds: 1000 }, () => (aCalled = true));
    sut.taggedTimers.register("b", { milliseconds: 1000 }, () => (bCalled = true));

    for (const callback of sut.taggedTimers.take("a", Number.POSITIVE_INFINITY)) callback();

    expect(aCalled).toBe(true);
    expect(bCalled).toBe(false);
    expect(sut.taggedTimers.take("b", Number.POSITIVE_INFINITY)).toHaveLength(1);
  });

  test("disposing the returned handle removes it from the heap and from its tag's list", () => {
    const sut = new FakeManualRuntime(0);
    let called = false;
    const handle = sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => (called = true));
    handle.dispose();

    const callbacks = sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY);

    expect(callbacks).toEqual([]);
    expect(called).toBe(false);
  });

  test("disposing a middle entry directly still lets take() retrieve the rest, in order", () => {
    const sut = new FakeManualRuntime(0);
    const order: number[] = [];
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(1));
    const middle = sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(2));
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(3));

    middle.dispose();
    for (const callback of sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)) callback();

    expect(order).toEqual([1, 3]);
  });

  test("disposing the tail entry directly still lets take() retrieve the rest, in order", () => {
    const sut = new FakeManualRuntime(0);
    const order: number[] = [];
    sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(1));
    const tail = sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(2));

    tail.dispose();
    for (const callback of sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)) callback();

    expect(order).toEqual([1]);
  });

  test("disposing a handle after it's been taken is a safe no-op", () => {
    const sut = new FakeManualRuntime(0);
    const handle = sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => {});
    sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY);
    expect(() => handle.dispose()).not.toThrow();
    expect(handle.isDisposed).toBe(true);
  });

  test("a tagged entry coexists with plain once()/every() entries in the shared heap", () => {
    const sut = new FakeManualRuntime(0);
    const order: string[] = [];
    sut.taggedTimers.register("tag", { milliseconds: 100000 }, () => order.push("tagged"));
    sut.timers.once({ milliseconds: 10 }, () => order.push("timeout"));

    sut.advance({ milliseconds: 20 });

    // The tagged entry is due impossibly far in the future, so advancing past the unrelated
    // timeout must not disturb it.
    expect(order).toEqual(["timeout"]);
    expect(sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)).toHaveLength(1);
  });

  test("a tagged entry that becomes naturally due fires through the normal heap, and can't be taken again", () => {
    const sut = new FakeManualRuntime(0);
    const order: string[] = [];
    sut.taggedTimers.register("tag", { milliseconds: 10 }, () => order.push("fired"));

    sut.advance({ milliseconds: 10 });

    expect(order).toEqual(["fired"]);
    expect(sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)).toEqual([]);
  });

  test("disposing the runtime disposes still-pending tagged entries too", () => {
    const sut = new FakeManualRuntime(0);
    const handle = sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => {});
    sut.dispose();
    expect(handle.isDisposed).toBe(true);
  });

  describe("lazy deletion (take() tombstones instead of removing immediately)", () => {
    test("taking under the compaction threshold still leaves the remainder correctly ordered", () => {
      const sut = new FakeManualRuntime(0);
      const order: number[] = [];
      for (let i = 1; i <= 10; i++) {
        sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(i));
      }

      // 2 of 10 taken (20%) stays under the 50% compaction threshold - the taken two are
      // tombstones, not physically removed, when the rest are taken next.
      for (const callback of sut.taggedTimers.take("tag", 2)) callback();
      expect(order).toEqual([1, 2]);

      for (const callback of sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)) callback();
      expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test("crossing the compaction threshold still behaves correctly for everything registered afterward", () => {
      const sut = new FakeManualRuntime(0);
      const firstRound: number[] = [];
      for (let i = 1; i <= 10; i++) {
        sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => firstRound.push(i));
      }
      // Taking all 10 of 10 (100%) crosses the 50% threshold, triggering a compaction that
      // rebuilds the heap array and every survivor's heapIndex from scratch.
      for (const callback of sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)) callback();
      expect(firstRound).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const secondRound: number[] = [];
      for (let i = 1; i <= 5; i++) {
        sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => secondRound.push(i));
      }
      for (const callback of sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)) callback();
      expect(secondRound).toEqual([1, 2, 3, 4, 5]);
    });

    test("compaction that leaves survivors still fires them in the right order afterward", () => {
      const sut = new FakeManualRuntime(0);
      const order: string[] = [];
      // 6 tagged entries taken out of 10 total (60%) crosses the 50% threshold, triggering a
      // compaction that leaves the 4 untouched regular entries as survivors to re-heapify.
      for (let i = 0; i < 6; i++) {
        sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(`tagged${i}`));
      }
      sut.timers.once({ milliseconds: 30 }, () => order.push("d"));
      sut.timers.once({ milliseconds: 10 }, () => order.push("a"));
      sut.timers.once({ milliseconds: 20 }, () => order.push("c"));
      sut.timers.once({ milliseconds: 15 }, () => order.push("b"));

      for (const callback of sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)) callback();
      expect(order).toEqual(["tagged0", "tagged1", "tagged2", "tagged3", "tagged4", "tagged5"]);

      sut.advance({ milliseconds: 30 });
      expect(order.slice(6)).toEqual(["a", "b", "c", "d"]);
    });

    test("repeated register/take cycles across many compactions stay correct", () => {
      const sut = new FakeManualRuntime(0);
      for (let round = 0; round < 20; round++) {
        const order: number[] = [];
        for (let i = 1; i <= 100; i++) {
          sut.taggedTimers.register("tag", { milliseconds: 1000 }, () => order.push(i));
        }
        for (const callback of sut.taggedTimers.take("tag", Number.POSITIVE_INFINITY)) callback();
        expect(order).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
      }
    });

    test("a tombstone reached naturally via advance() doesn't fire, and doesn't block entries sharing its due time", () => {
      const sut = new FakeManualRuntime(0);
      const order: string[] = [];
      // Six total entries keeps the one tombstone below the 50% compaction threshold, so it
      // stays a physical tombstone in the heap - registered first, so it's the heap root - when
      // advance() reaches it, exercising drainDue's isDisposed skip rather than compaction.
      sut.taggedTimers.register("tag", { milliseconds: 10 }, () => order.push("a"));
      sut.timers.once({ milliseconds: 10 }, () => order.push("b"));
      sut.timers.once({ milliseconds: 10 }, () => order.push("c"));
      sut.timers.once({ milliseconds: 20 }, () => order.push("d"));
      sut.timers.once({ milliseconds: 20 }, () => order.push("e"));
      sut.timers.once({ milliseconds: 20 }, () => order.push("f"));

      const [aCallback] = sut.taggedTimers.take("tag", 1);
      aCallback!();
      expect(order).toEqual(["a"]);

      sut.advance({ milliseconds: 10 });
      expect(order).toEqual(["a", "b", "c"]);

      sut.advance({ milliseconds: 10 });
      expect(order).toEqual(["a", "b", "c", "d", "e", "f"]);
    });
  });
});

describe("BaseManualRuntime microtasks and dispose", () => {
  test("disposing the runtime discards still-queued microtasks", () => {
    const sut = new FakeManualRuntime(0);
    let called = false;
    sut.microtasks.queue(() => (called = true));

    sut.dispose();
    sut.microtasks.drain();

    expect(called).toBe(false);
  });

  test("a microtask that disposes its own runtime doesn't crash the still-running checkpoint", () => {
    const sut = new FakeManualRuntime(0);
    const log: string[] = [];
    sut.microtasks.queue(() => {
      log.push("m1");
      sut.dispose();
    });
    sut.microtasks.queue(() => log.push("m2"));

    expect(() => sut.microtasks.drain()).not.toThrow();
    // m1 disposed the runtime mid-checkpoint, clearing the queue before m2 got its turn.
    expect(log).toEqual(["m1"]);
  });
});
