import { describe, expect, test } from "vite-plus/test";
import type { DueHandle, IScheduler, IRuntime } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { addon, createAddon, type IIdleBuilderExtra } from "../src/deterministic.ts";
import { DeterministicIdleScheduler } from "../src/deterministic-idle-scheduler.ts";
import type { WithIdleApi } from "../src/types.ts";

type FakeRuntime = IRuntime<unknown> & { idle?: unknown };

/*
 * applyToRuntime only touches what it's documented to (define `.idle`, read `.scheduler`), so a
 * minimal object satisfies it for a focused unit test without needing a real plugin/runtime - the
 * cast is safe because these tests never exercise anything else on the fake runtime.
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
      throw new Error("not used by the idle addon");
    },
    clearInterval() {
      throw new Error("not used by the idle addon");
    },
    setRecurring() {
      throw new Error("not used by the idle addon");
    },
    clearRecurring() {
      throw new Error("not used by the idle addon");
    },
  };
  return {
    runtime: { scheduler } as unknown as FakeRuntime,
    scheduled,
  };
}

describe("idleAddon (deterministic)", () => {
  test("applyToRuntime defines .idle with a DeterministicIdleScheduler", () => {
    const { runtime } = fakeDeterministicRuntime();
    addon.applyToRuntime(runtime);
    expect(runtime.idle).toBeInstanceOf(DeterministicIdleScheduler);
  });

  test("applyToRuntime wires .idle to the runtime's own scheduler", () => {
    const { runtime, scheduled } = fakeDeterministicRuntime();
    addon.applyToRuntime(runtime);
    const scheduler = runtime.idle as DeterministicIdleScheduler;
    scheduler.requestIdleCallback(() => {});
    expect(scheduled.size).toBe(1);
  });

  test("applyToRuntime leaves the runtime's own .scheduler facade alone", () => {
    const { runtime } = fakeDeterministicRuntime();
    const scheduler = runtime.scheduler;
    addon.applyToRuntime(runtime);
    expect(runtime.scheduler).toBe(scheduler);
  });

  test("withIdleDelay configures the deterministic scheduler's idle delay", () => {
    const instance = createAddon().withIdleDelay(100);
    const { runtime } = fakeDeterministicRuntime();
    instance.applyToRuntime(runtime);
    const scheduler = runtime.idle as DeterministicIdleScheduler;
    expect(scheduler.idleDelay).toBe(100);
  });

  test("withIdleDelay returns the same addon instance, for chaining", () => {
    const instance = createAddon();
    expect(instance.withIdleDelay(100)).toBe(instance);
  });

  test.each([50, 250])(
    "createAddon() returns an independent instance each call - configuring one never affects another",
    (delayMs: number) => {
      const defaultDelayMs = 1;
      const configured = createAddon().withIdleDelay(delayMs);
      const untouched = createAddon();

      const configuredRuntime = fakeDeterministicRuntime().runtime;
      configured.applyToRuntime(configuredRuntime);
      const untouchedRuntime = fakeDeterministicRuntime().runtime;
      untouched.applyToRuntime(untouchedRuntime);

      expect((configuredRuntime.idle as DeterministicIdleScheduler).idleDelay).toBe(delayMs);
      expect((untouchedRuntime.idle as DeterministicIdleScheduler).idleDelay).toBe(defaultDelayMs);
    },
  );

  describe("clone", () => {
    test("returns a distinct instance", () => {
      expect(addon.clone()).not.toBe(addon);
    });

    test("returns a distinct addon that still applies a DeterministicIdleScheduler", () => {
      const cloned = addon.clone() as IDeterministicAddon<unknown, WithIdleApi> & IIdleBuilderExtra;
      const runtime = fakeDeterministicRuntime().runtime;
      cloned.applyToRuntime(runtime);
      expect(runtime.idle).toBeInstanceOf(DeterministicIdleScheduler);
    });

    test.each([50, 250])("copy an existing idle delay", (delayMs: number) => {
      const original = addon.clone() as IDeterministicAddon<unknown, WithIdleApi> &
        IIdleBuilderExtra;
      original.withIdleDelay(delayMs);
      const runtime = fakeDeterministicRuntime().runtime;
      original.clone().applyToRuntime(runtime);
      expect((runtime.idle as DeterministicIdleScheduler).idleDelay).toEqual(delayMs);
    });

    test.each([50, 250])(
      "configuring a clone via withIdleDelay never affects the shared addon it was cloned from",
      (delayMs: number) => {
        const defaultDelayMs = 1;
        const clone = addon.clone() as IDeterministicAddon<unknown, unknown> & {
          withIdleDelay(delayMilliseconds: number): unknown;
        };
        clone.withIdleDelay(delayMs);

        const clonedRuntime = fakeDeterministicRuntime().runtime;
        clone.applyToRuntime(clonedRuntime);
        const sharedRuntime = fakeDeterministicRuntime().runtime;
        addon.applyToRuntime(sharedRuntime);

        expect((clonedRuntime.idle as DeterministicIdleScheduler).idleDelay).toBe(delayMs);
        expect((sharedRuntime.idle as DeterministicIdleScheduler).idleDelay).toBe(defaultDelayMs);
      },
    );
  });
});
