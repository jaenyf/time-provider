import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  type IScheduledHandle,
  type ITimers,
  type IRuntime,
  type IAddon,
} from "@time-provider/core";
import { addon as addonBuilderFactory } from "../src/deterministic.ts";
import { DeterministicAnimationFrameScheduler } from "../src/deterministic-animation-frame-scheduler.ts";

type FakeRuntime = IRuntime<unknown> & { animation?: unknown };
type AnimationFacade = { scheduleFrame: (callback: () => void) => IScheduledHandle };

/*
 * applyToRuntime only touches what it's documented to (define `.animation`,
 * read `.scheduler`), so a minimal object satisfies it for a focused unit test
 * without needing a real plugin/runtime - the cast is safe because these tests
 * never exercise anything else on the fake runtime.
 */
function fakeDeterministicRuntime(): {
  runtime: FakeRuntime;
  scheduled: Map<number, () => void>;
  delays: number[];
} {
  const scheduled = new Map<number, () => void>();
  const delays: number[] = [];
  let nextHandle = 1;
  const timers: ITimers = {
    once(delay, callback) {
      delays.push(toDuration(delay));
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
    delays,
  };
}

describe("animationFrameAddon (deterministic)", () => {
  test("applyToRuntime defines .animation with a scheduleFrame() facade, not the addon itself", () => {
    const { runtime } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.animation).not.toBeInstanceOf(DeterministicAnimationFrameScheduler);
    expect(runtime.animation).toStrictEqual({ scheduleFrame: expect.any(Function) });
  });

  test("applyToRuntime wires .animation to the runtime's own scheduler", () => {
    const { runtime, scheduled } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    const scheduler = runtime.animation as AnimationFacade;
    scheduler.scheduleFrame(() => {});
    expect(scheduled.size).toBe(1);
  });

  test("withHostFramesRate configures the delay scheduleFrame() schedules with", () => {
    const instance = addonBuilderFactory().withHostFramesRate(100).create();
    const { runtime, delays } = fakeDeterministicRuntime();
    instance.applyToRuntime(runtime);
    (runtime.animation as AnimationFacade).scheduleFrame(() => {});
    expect(delays).toStrictEqual([1000 / 100]);
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

      const { runtime: configuredRuntime, delays: configuredDelays } = fakeDeterministicRuntime();
      configured.applyToRuntime(configuredRuntime);
      (configuredRuntime.animation as AnimationFacade).scheduleFrame(() => {});

      const { runtime: untouchedRuntime, delays: untouchedDelays } = fakeDeterministicRuntime();
      untouched.applyToRuntime(untouchedRuntime);
      (untouchedRuntime.animation as AnimationFacade).scheduleFrame(() => {});

      expect(configuredDelays).toStrictEqual([1000 / fps]);
      expect(untouchedDelays).toStrictEqual([1000 / defaultFps]);
    },
  );

  test.each([90, 120])(
    "create() returns an independent scheduler each call from the same configured builder",
    (fps: number) => {
      const builder = addonBuilderFactory().withHostFramesRate(fps);
      const first = builder.create();
      const second = builder.create();
      expect(first).not.toBe(second);

      const { runtime: firstRuntime, delays: firstDelays } = fakeDeterministicRuntime();
      first.applyToRuntime(firstRuntime);
      (firstRuntime.animation as AnimationFacade).scheduleFrame(() => {});

      const { runtime: secondRuntime, delays: secondDelays } = fakeDeterministicRuntime();
      second.applyToRuntime(secondRuntime);
      (secondRuntime.animation as AnimationFacade).scheduleFrame(() => {});

      expect(firstDelays).toStrictEqual([1000 / fps]);
      expect(secondDelays).toStrictEqual([1000 / fps]);
    },
  );
});
