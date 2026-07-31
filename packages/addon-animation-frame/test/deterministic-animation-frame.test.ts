import { describe, expect, test } from "vite-plus/test";
import type { IScheduler, SetTimeoutHandle } from "@time-provider/core";
import { DeterministicAnimationFrameScheduler } from "../src/deterministic-animation-frame.ts";

/*
 * requestAnimationFrame/cancelAnimationFrame just delegate to setTimeout/clearTimeout
 * (see deterministic-animation-frame.ts for why) - the one-shot/cancellation/compaction
 * behavior itself is already covered by core's own setTimeout tests, so these only need
 * to check the delegation contract, not re-simulate a queue.
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
        return handle as unknown as SetTimeoutHandle;
      },
      clearTimeout(handle) {
        cleared.add(handle as unknown as number);
      },
      setInterval() {
        throw new Error("not used by DeterministicAnimationFrameScheduler");
      },
      clearInterval() {
        throw new Error("not used by DeterministicAnimationFrameScheduler");
      },
    },
  };
}

describe("DeterministicAnimationFrameScheduler", () => {
  describe("hostFramesRate", () => {
    test("defaults to 60", () => {
      const sut = new DeterministicAnimationFrameScheduler(fakeScheduler().scheduler);
      expect(sut.hostFramesRate).toBe(60);
    });
    test("can be read back after being set", () => {
      const sut = new DeterministicAnimationFrameScheduler(fakeScheduler().scheduler);
      sut.hostFramesRate = 30;
      expect(sut.hostFramesRate).toBe(30);
    });
    test.each([0, -1, -100, NaN])("throws for a non-positive value (%d)", (value) => {
      const sut = new DeterministicAnimationFrameScheduler(fakeScheduler().scheduler);
      expect(() => (sut.hostFramesRate = value)).toThrow();
    });
  });

  describe("requestAnimationFrame", () => {
    test("delegates to the runtime scheduler's setTimeout with the default ~16.67ms frame duration", () => {
      const { scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicAnimationFrameScheduler(scheduler);
      const callback = () => {};
      sut.requestAnimationFrame(callback);
      expect(scheduled.size).toBe(1);
      const [entry] = scheduled.values();
      expect(entry?.callback).toBe(callback);
      expect(entry?.delayMs).toBeCloseTo(1000 / 60, 5);
    });

    test("a configured hostFramesRate changes the scheduled delay", () => {
      const { scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicAnimationFrameScheduler(scheduler);
      sut.hostFramesRate = 100;
      sut.requestAnimationFrame(() => {});
      const [entry] = scheduled.values();
      expect(entry?.delayMs).toBe(10);
    });

    test("returns the underlying scheduler's handle", () => {
      const { scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicAnimationFrameScheduler(scheduler);
      const handle = sut.requestAnimationFrame(() => {});
      expect(scheduled.has(handle as unknown as number)).toBe(true);
    });
  });

  describe("cancelAnimationFrame", () => {
    test("delegates to the runtime scheduler's clearTimeout with the same handle", () => {
      const { scheduler, cleared } = fakeScheduler();
      const sut = new DeterministicAnimationFrameScheduler(scheduler);
      const handle = sut.requestAnimationFrame(() => {});
      sut.cancelAnimationFrame(handle);
      expect(cleared.has(handle as unknown as number)).toBe(true);
    });
  });
});
