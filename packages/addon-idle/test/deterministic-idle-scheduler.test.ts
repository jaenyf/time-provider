import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  type IDurationSpec,
  type IRuntime,
  type IScheduledHandle,
} from "@time-provider/core";
import { DeterministicIdleScheduler } from "../src/deterministic-idle-scheduler.ts";

/*
 * request just delegates to the runtime's own timers.once, and hands its handle back
 * as-is for cancellation via dispose() - the one-shot/cancellation behavior itself is already
 * covered by core's own setTimeout tests, so these only need to check the delegation contract,
 * not re-simulate a queue.
 */
function fakeRuntime(withAdvance = true): IRuntime<unknown> & {
  scheduled: Map<number, { callback: () => void; delayMs?: number }>;
  cleared: Set<number>;
  advance?: (options: { milliseconds: number }) => void;
} {
  const scheduled = new Map<
    number,
    { callback: () => void; delayMs?: number; dueAt: number; disposed: boolean }
  >();
  const cleared = new Set<number>();
  let nextHandle = 1;
  let elapsed = 0;
  const runtime = {
    scheduled,
    cleared,
    registerAddon: () => {},
    timers: {
      once(durationSpec: IDurationSpec, callback: () => void) {
        const id = nextHandle++;
        const delayMs = toDuration(durationSpec);
        scheduled.set(id, { callback, delayMs, dueAt: elapsed + delayMs, disposed: false });
        return {
          dispose: () => {
            const entry = scheduled.get(id);
            if (entry) entry.disposed = true;
            scheduled.delete(id);
            cleared.add(id);
          },
          isDisposed: false,
          [Symbol.dispose]: () => scheduled.delete(id),
          signal: new AbortController().signal,
        } as unknown as IScheduledHandle & { id: number };
      },
      every() {
        throw new Error("not used by DeterministicIdleScheduler");
      },
      recurring() {
        throw new Error("not used by DeterministicIdleScheduler");
      },
      wait() {
        throw new Error("not used by DeterministicIdleScheduler");
      },
    },
  } as unknown as IRuntime<unknown> & {
    scheduled: Map<number, { callback: () => void; delayMs?: number }>;
    cleared: Set<number>;
    advance?: (options: { milliseconds: number }) => void;
  };
  if (withAdvance) {
    runtime.advance = (options: { milliseconds: number }) => {
      elapsed += options.milliseconds;
      for (const [id, entry] of scheduled) {
        if (!entry.disposed && entry.dueAt <= elapsed) {
          scheduled.delete(id);
          entry.callback();
        }
      }
    };
  }
  return runtime;
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

  describe("idleDelay", () => {
    test("defaults to 1ms, so an idle callback is never drained in-line at registration", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      expect(sut.idleDelay).toBe(1);
    });
    test("can be read back after being set", () => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      sut.idleDelay = 250;
      expect(sut.idleDelay).toBe(250);
    });
    test.each([0, -1, -100, NaN])("clamps a non-positive value (%d) to 0", (value) => {
      using sut = new DeterministicIdleScheduler();
      sut.applyToRuntime(fakeRuntime());
      sut.idleDelay = 500;
      sut.idleDelay = value;
      expect(sut.idleDelay).toBe(0);
    });
  });

  describe("request", () => {
    test("delegates to the runtime's timers.once with the default 1ms idle delay", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      let called = false;
      sut.request(() => (called = true));
      expect(runtime.scheduled.size).toBe(1);
      const [entry] = runtime.scheduled.values();
      entry?.callback();
      expect(called).toBe(true);
      expect(entry?.delayMs).toBe(1);
    });

    test("a configured idleDelay changes the scheduled delay", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      sut.idleDelay = 42;
      sut.request(() => {});
      const [entry] = runtime.scheduled.values();
      expect(entry?.delayMs).toBe(42);
    });

    test("returns the underlying scheduled handle", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      const handle = sut.request(() => {});
      expect(handle).toBeDefined();

      handle.dispose();
      expect(runtime.cleared.size).toBe(1);
    });
  });

  describe("drain (placeholder implementation)", () => {
    test("advances the runtime's clock, firing due requests", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      let called = false;
      sut.request(() => (called = true));

      sut.drain();

      expect(called).toBe(true);
    });

    test("returns how many requests fired", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      sut.request(() => {});
      sut.request(() => {});
      sut.request(() => {});

      expect(sut.drain()).toBe(3);
    });

    test("a second drain with nothing pending returns 0", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      sut.request(() => {});
      sut.drain();

      expect(sut.drain()).toBe(0);
    });

    test("advances by maxCount milliseconds when given", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      const advanceCalls: number[] = [];
      runtime.advance = (options) => advanceCalls.push(options.milliseconds);
      sut.applyToRuntime(runtime);

      sut.drain(42);

      expect(advanceCalls).toStrictEqual([42]);
    });

    test("advances by idleDelay when maxCount is omitted", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      const advanceCalls: number[] = [];
      runtime.advance = (options) => advanceCalls.push(options.milliseconds);
      sut.idleDelay = 99;
      sut.applyToRuntime(runtime);

      sut.drain();

      expect(advanceCalls).toStrictEqual([99]);
    });

    test("is a safe no-op returning 0 when the runtime has no advance()", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime(false);
      sut.applyToRuntime(runtime);
      let called = false;
      sut.request(() => (called = true));

      expect(() => sut.drain()).not.toThrow();
      expect(sut.drain()).toBe(0);
      expect(called).toBe(false);
    });
  });
});
