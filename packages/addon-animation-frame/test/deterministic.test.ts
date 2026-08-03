import { describe, expect, test } from "vite-plus/test";
import type { DueHandle, ITimeProvider, IScheduler } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { addon, createAddon, type IAnimationFrameBuilderExtra } from "../src/deterministic.ts";
import { DeterministicAnimationFrameScheduler } from "../src/deterministic-animation-frame.ts";
import type { WithAnimationFrameApi } from "../src/types.ts";

type FakeRuntime = ITimeProvider<unknown> & { animation?: unknown };

/*
 * applyToRuntime only touches what it's documented to (define `.animation`,
 * read `.scheduler`), so a minimal object satisfies it for a focused unit test
 * without needing a real plugin/runtime - the cast is safe because these tests
 * never exercise anything else on the fake runtime.
 */
function fakeDeterministicRuntime(): {
  runtime: FakeRuntime;
  scheduled: Map<number, () => void>;
} {
  const scheduled = new Map<number, () => void>();
  let nextHandle = 1;
  const scheduler: IScheduler = {
    setTimeout(callback) {
      const handle = nextHandle++;
      scheduled.set(handle, callback);
      return handle as unknown as DueHandle;
    },
    clearTimeout(handle) {
      scheduled.delete(handle as unknown as number);
    },
    setInterval() {
      throw new Error("not used by the animation-frame addon");
    },
    clearInterval() {
      throw new Error("not used by the animation-frame addon");
    },
    setRecurring() {
      throw new Error("not used by the animation-frame addon");
    },
    clearRecurring() {
      throw new Error("not used by the animation-frame addon");
    },
  };
  return {
    runtime: { scheduler } as unknown as FakeRuntime,
    scheduled,
  };
}

describe("animationFrameAddon (deterministic)", () => {
  test("applyToRuntime defines .animation with a DeterministicAnimationFrameScheduler", () => {
    const { runtime } = fakeDeterministicRuntime();
    addon.applyToRuntime(runtime);
    expect(runtime.animation).toBeInstanceOf(DeterministicAnimationFrameScheduler);
  });

  test("applyToRuntime wires .animation to the runtime's own scheduler", () => {
    const { runtime, scheduled } = fakeDeterministicRuntime();
    addon.applyToRuntime(runtime);
    const scheduler = runtime.animation as DeterministicAnimationFrameScheduler;
    scheduler.requestAnimationFrame(() => {});
    expect(scheduled.size).toBe(1);
  });

  test("withHostFramesRate configures the deterministic scheduler's frame rate", () => {
    const instance = createAddon().withHostFramesRate(100);
    const { runtime } = fakeDeterministicRuntime();
    instance.applyToRuntime(runtime);
    const scheduler = runtime.animation as DeterministicAnimationFrameScheduler;
    expect(scheduler.hostFramesRate).toBe(100);
  });

  test("withHostFramesRate returns the same addon instance, for chaining", () => {
    const instance = createAddon();
    expect(instance.withHostFramesRate(100)).toBe(instance);
  });

  test.each([90, 120])(
    "createAnimationFrameAddon() returns an independent instance each call - configuring one never affects another",
    (fps: number) => {
      const defaultFps = 60;
      const configured = createAddon().withHostFramesRate(fps);
      const untouched = createAddon();

      const configuredRuntime = fakeDeterministicRuntime().runtime;
      configured.applyToRuntime(configuredRuntime);
      const untouchedRuntime = fakeDeterministicRuntime().runtime;
      untouched.applyToRuntime(untouchedRuntime);

      expect(
        (configuredRuntime.animation as DeterministicAnimationFrameScheduler).hostFramesRate,
      ).toBe(fps);
      expect(
        (untouchedRuntime.animation as DeterministicAnimationFrameScheduler).hostFramesRate,
      ).toBe(defaultFps);
    },
  );

  describe("clone", () => {
    test("returns a distinct instance", () => {
      expect(addon.clone()).not.toBe(addon);
    });

    test("returns a distinct addon that still applies a SystemAnimationFrameScheduler", () => {
      const cloned = addon.clone() as IDeterministicAddon<unknown, WithAnimationFrameApi> &
        IAnimationFrameBuilderExtra;
      const runtime = fakeDeterministicRuntime().runtime;
      cloned.applyToRuntime(runtime);
      expect(runtime.animation).toBeInstanceOf(DeterministicAnimationFrameScheduler);
    });

    test.each([90, 120])("copy an existing host frames rate", (fps: number) => {
      const original = addon.clone() as IDeterministicAddon<unknown, WithAnimationFrameApi> &
        IAnimationFrameBuilderExtra;
      original.withHostFramesRate(fps);
      const runtime = fakeDeterministicRuntime().runtime;
      original.clone().applyToRuntime(runtime);
      expect((runtime.animation as DeterministicAnimationFrameScheduler).hostFramesRate).toEqual(
        fps,
      );
    });

    test.each([90, 120])(
      "configuring a clone via withHostFramesRate never affects the shared addon it was cloned from",
      (fps: number) => {
        const defaultFps = 60;
        const clone = addon.clone() as IDeterministicAddon<unknown, unknown> & {
          withHostFramesRate(rate: number): unknown;
        };
        clone.withHostFramesRate(fps);

        const clonedRuntime = fakeDeterministicRuntime().runtime;
        clone.applyToRuntime(clonedRuntime);
        const sharedRuntime = fakeDeterministicRuntime().runtime;
        addon.applyToRuntime(sharedRuntime);

        expect(
          (clonedRuntime.animation as DeterministicAnimationFrameScheduler).hostFramesRate,
        ).toBe(fps);
        expect(
          (sharedRuntime.animation as DeterministicAnimationFrameScheduler).hostFramesRate,
        ).toBe(defaultFps);
      },
    );
  });
});
