import { describe, expect, test } from "vite-plus/test";
import { toDuration, type ITimerHandle, type ITimers } from "@time-provider/core";
import { DeterministicAnimationFrameScheduler } from "../src/deterministic-animation-frame-scheduler.ts";

/*
 * requestAnimationFrame/cancelAnimationFrame just delegate to setTimeout/clearTimeout
 * (see deterministic-animation-frame.ts for why) - the one-shot/cancellation/compaction
 * behavior itself is already covered by core's own setTimeout tests, so these only need
 * to check the delegation contract, not re-simulate a queue.
 */
function fakeScheduler(): {
  timers: ITimers;
  scheduled: Map<number, { callback: () => void; delayMs?: number }>;
  cleared: Set<number>;
} {
  const scheduled = new Map<
    number,
    { callback: () => void; delayMs?: number; dispose: () => void; isDisposed: boolean }
  >();
  const cleared = new Set<number>();
  let nextHandle = 1;
  return {
    scheduled,
    cleared,
    timers: {
      once(durationSpec, callback) {
        const handle = {
          id: nextHandle++,
          kind: 2,
          isDisposed: false,
          dispose: () => {
            cleared.add(handle.id);
          },
        };
        scheduled.set((handle as unknown as { id: number }).id, {
          callback,
          delayMs: toDuration(durationSpec),
          dispose: () => {
            cleared.add(handle.id);
          },
          isDisposed: false,
        });
        return handle as unknown as ITimerHandle;
      },
      every() {
        throw new Error("not used by DeterministicAnimationFrameScheduler");
      },
      recurring() {
        throw new Error("not used by DeterministicAnimationFrameScheduler");
      },
      wait() {
        throw new Error("not used by DeterministicAnimationFrameScheduler");
      },
    },
  };
}

describe("DeterministicAnimationFrameScheduler", () => {
  describe("dispose", () => {
    test("explicit dispose call disposes instance", () => {
      const sut = new DeterministicAnimationFrameScheduler(fakeScheduler().timers);
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("implicit dispose call disposes instance", () => {
      let sutRef: DeterministicAnimationFrameScheduler | undefined = undefined;
      {
        using sut = new DeterministicAnimationFrameScheduler(fakeScheduler().timers);
        sutRef = sut;
      }
      expect(sutRef.isDisposed).toBe(true);
    });
  });
  describe("hostFramesRate", () => {
    test("defaults to 60", () => {
      const sut = new DeterministicAnimationFrameScheduler(fakeScheduler().timers);
      expect(sut.hostFramesRate).toBe(60);
    });
    test("can be read back after being set", () => {
      const sut = new DeterministicAnimationFrameScheduler(fakeScheduler().timers);
      sut.hostFramesRate = 30;
      expect(sut.hostFramesRate).toBe(30);
    });
    test.each([0, -1, -100, NaN])("throws for a non-positive value (%d)", (value) => {
      const sut = new DeterministicAnimationFrameScheduler(fakeScheduler().timers);
      expect(() => (sut.hostFramesRate = value)).toThrow(
        `Invalid host frame rate (value was "${String(value)}")`,
      );
    });
  });

  describe("requestAnimationFrame", () => {
    test("delegates to the runtime scheduler's setTimeout with the default ~16.67ms frame duration", () => {
      const { timers: scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicAnimationFrameScheduler(scheduler);
      const callback = () => {};
      sut.requestAnimationFrame(callback);
      expect(scheduled.size).toBe(1);
      const [entry] = scheduled.values();
      expect(entry?.callback).toBe(callback);
      expect(entry?.delayMs).toBeCloseTo(1000 / 60, 5);
    });

    test("a configured hostFramesRate changes the scheduled delay", () => {
      const { timers: scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicAnimationFrameScheduler(scheduler);
      sut.hostFramesRate = 100;
      sut.requestAnimationFrame(() => {});
      const [entry] = scheduled.values();
      expect(entry?.delayMs).toBe(10);
    });

    test("returns the underlying scheduler's handle", () => {
      const { timers: scheduler, scheduled } = fakeScheduler();
      const sut = new DeterministicAnimationFrameScheduler(scheduler);
      const handle = sut.requestAnimationFrame(() => {});
      expect(scheduled.has((handle as unknown as { id: number }).id)).toBe(true);
    });
  });

  describe("cancelAnimationFrame", () => {
    test("delegates to the runtime scheduler's clearTimeout with the same handle", () => {
      const { timers: scheduler, cleared } = fakeScheduler();
      const sut = new DeterministicAnimationFrameScheduler(scheduler);
      const handle = sut.requestAnimationFrame(() => {});
      sut.cancelAnimationFrame(handle);
      expect(cleared.has((handle as unknown as { id: number }).id)).toBe(true);
    });
  });
});
