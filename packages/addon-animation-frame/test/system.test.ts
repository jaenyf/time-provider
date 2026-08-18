import { describe, expect, test } from "vite-plus/test";
import type { IRuntime } from "@time-provider/core";
import { addon } from "../src/index.ts";
import { SystemAnimationFrameTimers } from "../src/system-animation-frame-timers.ts";
import "./polyfills.ts";

type FakeRuntime = IRuntime<unknown> & { animation?: unknown };

/*
 * applyToSystem only touches what it's documented to (define `.animation`),
 * so a minimal object satisfies it for a focused unit test without needing a
 * real plugin/runtime - the cast is safe because these tests never exercise
 * anything else on the fake runtime.
 */
function fakeSystemRuntime(): FakeRuntime {
  return {} as FakeRuntime;
}

describe("animationFrameAddon (system)", () => {
  test("applyToSystem defines .animation with a SystemAnimationFrameScheduler", () => {
    const runtime = fakeSystemRuntime();
    addon.applyToRuntime(runtime);
    expect(runtime.animation).toBeInstanceOf(SystemAnimationFrameTimers);
  });

  test("applyToSystem's defined property is enumerable but not writable", () => {
    const runtime = fakeSystemRuntime();
    addon.applyToRuntime(runtime);
    const descriptor = Object.getOwnPropertyDescriptor(runtime, "animation");
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.writable).toBe(false);
  });

  describe("clone", () => {
    test("returns a distinct instance", () => {
      expect(addon.clone()).not.toBe(addon);
    });

    test("returns a distinct addon that still applies a SystemAnimationFrameScheduler", () => {
      const cloned = addon.clone();
      const runtime = fakeSystemRuntime();
      cloned.applyToRuntime(runtime);
      expect(runtime.animation).toBeInstanceOf(SystemAnimationFrameTimers);
    });
  });
});
