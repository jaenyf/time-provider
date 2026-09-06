import { describe, expect, test } from "vite-plus/test";
import type { IScheduledHandle, ITimers, IRuntime, IAddon } from "@time-provider/core";
import { addon as addonBuilderFactory } from "../src/deterministic.ts";
import { DeterministicAnimationFrameScheduler } from "../src/deterministic-animation-frame-scheduler.ts";

type FakeRuntime = IRuntime<unknown> & { animation?: unknown };

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
  const timers: ITimers = {
    once(_delay, callback) {
      const handle = nextHandle++;
      scheduled.set(handle, callback);
      return handle as unknown as IScheduledHandle;
    },
    every() {
      throw new Error("not used by the animation-frame addon");
    },
    recurring() {
      throw new Error("not used by the animation-frame addon");
    },
    wait() {
      throw new Error("not used by the animation-frame addon");
    },
  };
  return {
    runtime: {
      timers: timers,
      registerAddon: (_addon: IAddon<unknown>) => {},
    } as unknown as FakeRuntime,
    scheduled,
  };
}

type DeterministicAnimationFacade = { scheduleFrame: (callback: () => void) => unknown } & {
  hostFramesRate: number;
};

describe("animationFrameAddon (deterministic)", () => {
  test("applyToRuntime defines .animation with a scheduleFrame()/hostFramesRate facade, not the addon itself", () => {
    const { runtime } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.animation).not.toBeInstanceOf(DeterministicAnimationFrameScheduler);
    const facade = runtime.animation as DeterministicAnimationFacade;
    expect(facade.scheduleFrame).toEqual(expect.any(Function));
    expect(facade.hostFramesRate).toBe(60);
  });

  test("applyToRuntime wires .animation to the runtime's own scheduler", () => {
    const { runtime, scheduled } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    const scheduler = runtime.animation as DeterministicAnimationFacade;
    scheduler.scheduleFrame(() => {});
    expect(scheduled.size).toBe(1);
  });

  test("withHostFramesRate configures the deterministic scheduler's frame rate", () => {
    const instance = addonBuilderFactory().withHostFramesRate(100).create();
    const { runtime } = fakeDeterministicRuntime();
    instance.applyToRuntime(runtime);
    const scheduler = runtime.animation as DeterministicAnimationFacade;
    expect(scheduler.hostFramesRate).toBe(100);
  });

  test("withHostFramesRate returns the same builder, for chaining", () => {
    const builder = addonBuilderFactory();
    expect(builder.withHostFramesRate(100)).toBe(builder);
  });

  test.each([90, 120])(
    "addon() returns an independent builder each call - configuring one never affects another",
    (fps: number) => {
      const defaultFps = 60;
      const configured = addonBuilderFactory().withHostFramesRate(fps).create();
      const untouched = addonBuilderFactory().create();

      const configuredRuntime = fakeDeterministicRuntime().runtime;
      configured.applyToRuntime(configuredRuntime);
      const untouchedRuntime = fakeDeterministicRuntime().runtime;
      untouched.applyToRuntime(untouchedRuntime);

      expect((configuredRuntime.animation as DeterministicAnimationFacade).hostFramesRate).toBe(
        fps,
      );
      expect((untouchedRuntime.animation as DeterministicAnimationFacade).hostFramesRate).toBe(
        defaultFps,
      );
    },
  );

  test.each([90, 120])(
    "create() returns an independent scheduler each call from the same configured builder",
    (fps: number) => {
      const builder = addonBuilderFactory().withHostFramesRate(fps);
      const first = builder.create();
      const second = builder.create();
      expect(first).not.toBe(second);

      const firstRuntime = fakeDeterministicRuntime().runtime;
      first.applyToRuntime(firstRuntime);
      const secondRuntime = fakeDeterministicRuntime().runtime;
      second.applyToRuntime(secondRuntime);

      expect((firstRuntime.animation as DeterministicAnimationFacade).hostFramesRate).toBe(fps);
      expect((secondRuntime.animation as DeterministicAnimationFacade).hostFramesRate).toBe(fps);
    },
  );
});
