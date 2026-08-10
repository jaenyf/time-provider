import { describe, expect, test } from "vite-plus/test";
import type { DueHandle, IScheduler } from "@time-provider/core";
import { DeterministicIdleScheduler } from "../src/deterministic-idle-scheduler.ts";

/*
 * requestIdleCallback/cancelIdleCallback just delegate to setTimeout/clearTimeout
 * (see deterministic-idle-scheduler.ts for why) - the one-shot/cancellation behavior itself is
 * already covered by core's own setTimeout tests, so these only need to check the delegation
 * contract, not re-simulate a queue.
 */
function fakeScheduler(): {
  scheduler: IScheduler;
  scheduled: Map<number, { callback: () => void; delayMs?: number }>;
  cleared: Set<number>;
} {
  const scheduled = new Map<number, { callback: () => void; delayMs?: number }>();
  const cleared = new Set<number>();
  let nextHandle = 1;
  return {
    scheduled,
    cleared,
    scheduler: {
      setTimeout(callback, millisecondsDelay) {
        const handle = nextHandle++;
        scheduled.set(handle, { callback, delayMs: millisecondsDelay });
        return handle as unknown as DueHandle;
      },
      clearTimeout(handle) {
        cleared.add(handle as unknown as number);
      },
      setInterval() {
        throw new Error("not used by DeterministicIdleScheduler");
      },
      clearInterval() {
        throw new Error("not used by DeterministicIdleScheduler");
      },
      setRecurring() {
        throw new Error("not used by DeterministicIdleScheduler");
      },
      clearRecurring() {
        throw new Error("not used by DeterministicIdleScheduler");
      },
    },
  };
}

describe("DeterministicIdleScheduler", () => {
  describe("idleDelay", () => {
    test("defaults to 1ms, so an idle callback is never drained in-line at registration", () => {
      const sut = new DeterministicIdleScheduler(fakeScheduler().scheduler);
      expect(sut.idleDelay).toBe(1);
    });
    test("can be read back after being set", () => {
      const sut = new DeterministicIdleScheduler(fakeScheduler().scheduler);
      sut.idleDelay = 250;
      expect(sut.idleDelay).toBe(250);
    });
    test.each([0, -1, -100, NaN])("clamps a non-positive value (%d) to 0", (value) => {
      const sut = new DeterministicIdleScheduler(fakeScheduler().scheduler);
      sut.idleDelay = 500;
      sut.idleDelay = value;
      expect(sut.idleDelay).toBe(0);
    });
  });

  describe("requestIdleCallback", () => {
    test("delegates to the runtime scheduler's setTimeout with the default 1ms idle delay", () => {
      const { scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicIdleScheduler(scheduler);
      const callback = () => {};
      sut.requestIdleCallback(callback);
      expect(scheduled.size).toBe(1);
      const [entry] = scheduled.values();
      expect(entry?.callback).toBe(callback);
      expect(entry?.delayMs).toBe(1);
    });

    test("a configured idleDelay changes the scheduled delay", () => {
      const { scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicIdleScheduler(scheduler);
      sut.idleDelay = 42;
      sut.requestIdleCallback(() => {});
      const [entry] = scheduled.values();
      expect(entry?.delayMs).toBe(42);
    });

    test("returns the underlying scheduler's handle", () => {
      const { scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicIdleScheduler(scheduler);
      const handle = sut.requestIdleCallback(() => {});
      expect(scheduled.has(handle as unknown as number)).toBe(true);
    });
  });

  describe("cancelIdleCallback", () => {
    test("delegates to the runtime scheduler's clearTimeout with the same handle", () => {
      const { scheduler, cleared } = fakeScheduler();
      const sut = new DeterministicIdleScheduler(scheduler);
      const handle = sut.requestIdleCallback(() => {});
      sut.cancelIdleCallback(handle);
      expect(cleared.has(handle as unknown as number)).toBe(true);
    });
  });
});
