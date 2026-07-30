import { describe, expect, test } from "vite-plus/test";
import type { ITimeProvider, IScheduler, SetTimeoutHandle } from "@time-provider/core";
import type { IDeterministicTimeProviderAddon } from "@time-provider/core/deterministic";
import { addon, createAddon } from "../src/deterministic.ts";
import { DeterministicAnimationFrameScheduler } from "../src/deterministic-animation-frame.ts";

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
      return handle as unknown as SetTimeoutHandle;
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

  test("createAnimationFrameAddon() returns an independent instance each call - configuring one never affects another", () => {
    const configured = createAddon().withHostFramesRate(100);
    const untouched = createAddon();

    const configuredRuntime = fakeDeterministicRuntime().runtime;
    configured.applyToRuntime(configuredRuntime);
    const untouchedRuntime = fakeDeterministicRuntime().runtime;
    untouched.applyToRuntime(untouchedRuntime);

    expect(
      (configuredRuntime.animation as DeterministicAnimationFrameScheduler).hostFramesRate,
    ).toBe(100);
    expect(
      (untouchedRuntime.animation as DeterministicAnimationFrameScheduler).hostFramesRate,
    ).toBe(60);
  });

  describe("clone", () => {
    test("returns a distinct instance", () => {
      expect(addon.clone()).not.toBe(addon);
    });

    test("configuring a clone via withHostFramesRate never affects the shared addon it was cloned from", () => {
      const clone = addon.clone() as IDeterministicTimeProviderAddon<unknown, unknown> & {
        withHostFramesRate(rate: number): unknown;
      };
      clone.withHostFramesRate(100);

      const clonedRuntime = fakeDeterministicRuntime().runtime;
      clone.applyToRuntime(clonedRuntime);
      const sharedRuntime = fakeDeterministicRuntime().runtime;
      addon.applyToRuntime(sharedRuntime);

      expect((clonedRuntime.animation as DeterministicAnimationFrameScheduler).hostFramesRate).toBe(
        100,
      );
      expect((sharedRuntime.animation as DeterministicAnimationFrameScheduler).hostFramesRate).toBe(
        60,
      );
    });
  });
});
