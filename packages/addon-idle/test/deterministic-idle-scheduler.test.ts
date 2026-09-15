import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  type IDurationSpec,
  type IRuntime,
  type IScheduledHandle,
} from "@time-provider/core";
import { DeterministicIdleScheduler } from "../src/deterministic-idle-scheduler.ts";

interface TaggedEntry {
  tag: unknown;
  callback: () => void;
}

function makeHandle(entries: TaggedEntry[], entry: TaggedEntry): IScheduledHandle {
  let disposed = false;
  let abortController: AbortController | undefined;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    abortController?.abort();
    const index = entries.indexOf(entry);
    if (index >= 0) entries.splice(index, 1);
  };
  return {
    dispose,
    get isDisposed() {
      return disposed;
    },
    [Symbol.dispose]: dispose,
    get signal() {
      if (abortController === undefined) {
        abortController = new AbortController();
        if (disposed) {
          abortController.abort();
        } else {
          abortController.signal.addEventListener("abort", dispose);
        }
      }
      return abortController.signal;
    },
  } as unknown as IScheduledHandle;
}

/*
 * request() registers via the runtime's taggedTimers capability, and drain() retrieves via the
 * same tag - so this fake only needs to model register()/take() faithfully: registering never
 * fires in-line (a far-future delay), and take() removes and returns callbacks for a given tag,
 * oldest first, leaving entries under other tags untouched. dispose()ing a handle removes its
 * entry immediately, mirroring core's real tag-list unlink-on-dispose behavior.
 */
function fakeRuntime(): IRuntime<unknown> & { registeredCount: () => number } {
  const entries: TaggedEntry[] = [];
  const taggedTimers = {
    register(tag: unknown, delay: IDurationSpec, callback: () => void): IScheduledHandle {
      // A far-future delay is the one thing request() relies on this fake never doing: firing
      // in-line, the way an already-due (e.g. 0ms) delay normally would.
      expect(toDuration(delay)).toBeGreaterThan(0);
      const entry: TaggedEntry = { tag, callback };
      entries.push(entry);
      return makeHandle(entries, entry);
    },
    take(tag: unknown, maxCount: number): (() => void)[] {
      const callbacks: (() => void)[] = [];
      for (let i = 0; i < entries.length && callbacks.length < maxCount;) {
        if (entries[i].tag === tag) {
          callbacks.push(entries[i].callback);
          entries.splice(i, 1);
        } else {
          i++;
        }
      }
      return callbacks;
    },
  };
  return {
    registeredCount: () => entries.length,
    registerAddon: () => {},
    taggedTimers,
  } as unknown as IRuntime<unknown> & { registeredCount: () => number };
}

describe("DeterministicIdleScheduler", () => {
  describe("dispose", () => {
    test("explicit dispose call disposes instance", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("implicit dispose call disposes instance", () => {
      let sutRef: DeterministicIdleScheduler<unknown> | undefined = undefined;
      {
        using sut = new DeterministicIdleScheduler();
        sut.applyToRuntime(fakeRuntime());
        sutRef = sut;
      }
      expect(sutRef.isDisposed).toBe(true);
    });
  });

  describe("request", () => {
    test("does not run the callback in-line", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      let called = false;
      sut.request(() => (called = true));
      expect(called).toBe(false);
    });

    test("registers a real entry with the runtime's taggedTimers immediately", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      sut.request(() => {});
      expect(runtime.registeredCount()).toBe(1);
    });

    test("returns the underlying registered handle directly", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      const handle = sut.request(() => {});
      handle.dispose();
      expect(runtime.registeredCount()).toBe(0);
    });

    test("disposing the handle prevents the callback from ever running", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      let called = false;
      const handle = sut.request(() => (called = true));
      handle.dispose();
      sut.drain();
      expect(called).toBe(false);
    });

    test("disposing the handle after it already ran is a safe no-op", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      const handle = sut.request(() => {});
      sut.drain();
      expect(() => handle.dispose()).not.toThrow();
      expect(handle.isDisposed).toBe(true);
    });

    test("disposing the handle twice while still pending is a safe no-op", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      const handle = sut.request(() => {});
      handle.dispose();
      expect(() => handle.dispose()).not.toThrow();
      expect(handle.isDisposed).toBe(true);
    });

    test("[Symbol.dispose] disposes the handle, same as dispose()", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      let called = false;
      {
        using handle = sut.request(() => (called = true));
        expect(handle.isDisposed).toBe(false);
      }
      sut.drain();
      expect(called).toBe(false);
    });

    describe("abort signal", () => {
      test("aborting the signal cancels a still-pending request", () => {
        using sut = new DeterministicIdleScheduler();
        sut.applyToRuntime(fakeRuntime());
        let called = false;
        const handle = sut.request(() => (called = true));
        handle.signal.dispatchEvent(new Event("abort"));
        sut.drain();
        expect(called).toBe(false);
        expect(handle.isDisposed).toBe(true);
      });

      test("reading the signal after dispose returns an already-aborted signal", () => {
        using sut = new DeterministicIdleScheduler();
        sut.applyToRuntime(fakeRuntime());
        const handle = sut.request(() => {});
        handle.dispose();
        expect(handle.signal.aborted).toBe(true);
      });

      test("reading the signal twice returns the same signal instance", () => {
        using sut = new DeterministicIdleScheduler();
        sut.applyToRuntime(fakeRuntime());
        const handle = sut.request(() => {});
        expect(handle.signal).toBe(handle.signal);
      });
    });
  });

  describe("drain", () => {
    test("runs a pending request and removes its entry from the runtime", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      let called = false;
      sut.request(() => (called = true));

      sut.drain();

      expect(called).toBe(true);
      expect(runtime.registeredCount()).toBe(0);
    });

    test("returns how many requests ran", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      sut.request(() => {});
      sut.request(() => {});
      sut.request(() => {});

      expect(sut.drain()).toBe(3);
    });

    test("runs requests oldest-first", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      const order: number[] = [];
      sut.request(() => order.push(1));
      sut.request(() => order.push(2));
      sut.request(() => order.push(3));

      sut.drain();

      expect(order).toStrictEqual([1, 2, 3]);
    });

    test("a second drain with nothing pending returns 0 and does not throw", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      sut.request(() => {});
      sut.drain();

      expect(() => sut.drain()).not.toThrow();
      expect(sut.drain()).toBe(0);
    });

    test("draining an empty scheduler does not throw", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      expect(() => sut.drain()).not.toThrow();
      expect(sut.drain()).toBe(0);
    });

    describe("maxCount", () => {
      test("runs only maxCount requests, oldest first", () => {
        using sut = new DeterministicIdleScheduler();
        sut.applyToRuntime(fakeRuntime());
        const order: number[] = [];
        sut.request(() => order.push(1));
        sut.request(() => order.push(2));
        sut.request(() => order.push(3));

        const ran = sut.drain(2);

        expect(ran).toBe(2);
        expect(order).toStrictEqual([1, 2]);
      });

      test("leaves the remainder pending for a later drain", () => {
        using sut = new DeterministicIdleScheduler();
        sut.applyToRuntime(fakeRuntime());
        const order: number[] = [];
        sut.request(() => order.push(1));
        sut.request(() => order.push(2));
        sut.request(() => order.push(3));

        sut.drain(2);
        sut.drain();

        expect(order).toStrictEqual([1, 2, 3]);
      });

      test("a maxCount larger than what's pending just runs everything", () => {
        using sut = new DeterministicIdleScheduler();
        sut.applyToRuntime(fakeRuntime());
        sut.request(() => {});
        sut.request(() => {});

        expect(sut.drain(100)).toBe(2);
      });

      test("maxCount of 0 runs nothing", () => {
        using sut = new DeterministicIdleScheduler();
        sut.applyToRuntime(fakeRuntime());
        let called = false;
        sut.request(() => (called = true));

        expect(sut.drain(0)).toBe(0);
        expect(called).toBe(false);
      });
    });

    test("a request made from inside a draining callback lands on a later drain, not this one", () => {
      // Unlike a pending-list design whose flush loop re-checks what's left after each callback,
      // drain() here takes a fixed snapshot of callbacks up front - a reentrant request() adds a
      // new entry to the runtime's tag list, but that's not part of the snapshot already
      // in flight, so it can only be picked up by a later drain().
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      const order: string[] = [];
      sut.request(() => {
        order.push("first");
        sut.request(() => order.push("requested-during-drain"));
      });

      const ran = sut.drain();

      expect(order).toStrictEqual(["first"]);
      expect(ran).toBe(1);

      expect(sut.drain()).toBe(1);
      expect(order).toStrictEqual(["first", "requested-during-drain"]);
    });
  });
});
