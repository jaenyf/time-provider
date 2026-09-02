import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  type IDurationSpec,
  type IRuntime,
  type IScheduledHandle,
} from "@time-provider/core";
import { DeterministicAnimationFrameScheduler } from "../src/deterministic-animation-frame-scheduler.ts";

/*
 * requestAnimationFrame/cancelAnimationFrame just delegate to setTimeout/clearTimeout
 * (see deterministic-animation-frame.ts for why) - the one-shot/cancellation/compaction
 * behavior itself is already covered by core's own setTimeout tests, so these only need
 * to check the delegation contract, not re-simulate a queue.
 */
function fakeRuntime(): IRuntime<unknown> & {
  scheduled: Map<
    number,
    { callback: () => void; delayMs?: number; dispose: () => void; isDisposed: boolean }
  >;
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
    registerAddon: () => {},
    timers: {
      once(durationSpec: IDurationSpec, callback: () => void) {
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
        return handle as unknown as IScheduledHandle;
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
  } as unknown as IRuntime<unknown> & {
    scheduled: Map<
      number,
      { callback: () => void; delayMs?: number; dispose: () => void; isDisposed: boolean }
    >;
    cleared: Set<number>;
  };
}

describe("DeterministicAnimationFrameScheduler", () => {
  describe("dispose", () => {
    test("explicit dispose call disposes instance", () => {
      using sut = new DeterministicAnimationFrameScheduler();
      sut.applyToRuntime(fakeRuntime());
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("implicit dispose call disposes instance", () => {
      let sutRef: DeterministicAnimationFrameScheduler<unknown> | undefined = undefined;
      {
        using sut = new DeterministicAnimationFrameScheduler();
        sut.applyToRuntime(fakeRuntime());
        sutRef = sut;
      }
      expect(sutRef.isDisposed).toBe(true);
    });
  });
  describe("hostFramesRate", () => {
    test("defaults to 60", () => {
      using sut = new DeterministicAnimationFrameScheduler();
      sut.applyToRuntime(fakeRuntime());
      expect(sut.hostFramesRate).toBe(60);
    });
    test("can be read back after being set", () => {
      using sut = new DeterministicAnimationFrameScheduler();
      sut.applyToRuntime(fakeRuntime());
      sut.hostFramesRate = 30;
      expect(sut.hostFramesRate).toBe(30);
    });
    test.each([0, -1, -100, NaN])("throws for a non-positive value (%d)", (value) => {
      using sut = new DeterministicAnimationFrameScheduler();
      sut.applyToRuntime(fakeRuntime());
      expect(() => (sut.hostFramesRate = value)).toThrow(
        `Invalid host frame rate (value was "${String(value)}")`,
      );
    });
  });

  describe("requestAnimationFrame", () => {
    test("delegates to the runtime scheduler's setTimeout with the default ~16.67ms frame duration", () => {
      using sut = new DeterministicAnimationFrameScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      const callback = () => {};
      sut.scheduleFrame(callback);
      expect(runtime.scheduled.size).toBe(1);
      const [entry] = runtime.scheduled.values();
      expect(entry?.callback).toBe(callback);
      expect(entry?.delayMs).toBeCloseTo(1000 / 60, 5);
    });

    test("a configured hostFramesRate changes the scheduled delay", () => {
      using sut = new DeterministicAnimationFrameScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      sut.hostFramesRate = 100;
      sut.scheduleFrame(() => {});
      const [entry] = runtime.scheduled.values();
      expect(entry?.delayMs).toBe(10);
    });

    test("returns the underlying scheduler's handle", () => {
      using sut = new DeterministicAnimationFrameScheduler();
      const runtime = fakeRuntime();
      sut.applyToRuntime(runtime);
      const handle = sut.scheduleFrame(() => {});
      expect(runtime.scheduled.has((handle as unknown as { id: number }).id)).toBe(true);
    });
  });

  test("disposing handle delegates to the runtime scheduler's clearTimeout with the same handle", () => {
    using sut = new DeterministicAnimationFrameScheduler();
    const runtime = fakeRuntime();
    sut.applyToRuntime(runtime);
    const handle = sut.scheduleFrame(() => {});
    handle.dispose();
    expect(runtime.cleared.has((handle as unknown as { id: number }).id)).toBe(true);
  });
});
