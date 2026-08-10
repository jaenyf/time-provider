import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  type IDurationSpec,
  type IRuntime,
  type IScheduledHandle,
} from "@time-provider/core";
import { DeterministicIdleScheduler } from "../src/deterministic-idle-scheduler.ts";

/*
 * requestIdleCallback/cancelIdleCallback just delegate to the runtime's own timers.once/dispose -
 * the one-shot/cancellation behavior itself is already covered by core's own setTimeout tests, so
 * these only need to check the delegation contract, not re-simulate a queue.
 */
function fakeRuntime(): IRuntime<unknown> & {
  scheduled: Map<number, { callback: () => void; delayMs?: number }>;
  cleared: Set<number>;
} {
  const scheduled = new Map<number, { callback: () => void; delayMs?: number }>();
  const cleared = new Set<number>();
  let nextHandle = 1;
  return {
    scheduled,
    cleared,
    registerAddon: () => {},
    timers: {
      once(durationSpec: IDurationSpec, callback: () => void) {
        const id = nextHandle++;
        scheduled.set(id, { callback, delayMs: toDuration(durationSpec) });
        return {
          dispose: () => cleared.add(id),
          isDisposed: false,
          [Symbol.dispose]: () => cleared.add(id),
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
  };
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

  describe("requestIdleCallback", () => {
    test("delegates to the runtime's timers.once with the default 1ms idle delay", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      const callback = () => {};
      sut.requestIdleCallback(callback);
      expect(runtime.scheduled.size).toBe(1);
      const [entry] = runtime.scheduled.values();
      expect(entry?.callback).toBe(callback);
      expect(entry?.delayMs).toBe(1);
    });

    test("a configured idleDelay changes the scheduled delay", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      sut.idleDelay = 42;
      sut.requestIdleCallback(() => {});
      const [entry] = runtime.scheduled.values();
      expect(entry?.delayMs).toBe(42);
    });

    test("returns the underlying scheduled handle", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      const handle = sut.requestIdleCallback(() => {});
      expect(handle).toBeDefined();
    });
  });

  describe("cancelIdleCallback", () => {
    test("delegates to the underlying handle's dispose", () => {
      using sut = new DeterministicIdleScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      const handle = sut.requestIdleCallback(() => {});
      sut.cancelIdleCallback(handle);
      expect(runtime.cleared.size).toBe(1);
    });
  });
});
