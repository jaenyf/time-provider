import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  type IAddon,
  type IRuntime,
  type IScheduledHandle,
  type ITimers,
} from "@time-provider/core";
import { addon as addonBuilderFactory } from "../src/deterministic.ts";

type FakeRuntime = IRuntime<unknown> & { idle?: unknown };
type IdleFacade = {
  requestIdleCallback: (callback: () => void) => unknown;
  cancelIdleCallback: (handle: unknown) => void;
};

/*
 * applyToRuntime only touches what it's documented to (define `.idle`, use `.timers.once`), so a
 * minimal object satisfies it for a focused unit test without needing a real plugin/runtime - the
 * cast is safe because these tests never exercise anything else on the fake runtime.
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
      return {
        dispose: () => scheduled.delete(handle),
        isDisposed: false,
        [Symbol.dispose]: () => scheduled.delete(handle),
        signal: new AbortController().signal,
      } as unknown as IScheduledHandle;
    },
    every() {
      throw new Error("not used by the idle addon");
    },
    recurring() {
      throw new Error("not used by the idle addon");
    },
    wait() {
      throw new Error("not used by the idle addon");
    },
  };
  return {
    runtime: {
      timers,
      registerAddon: (_addon: IAddon<unknown>) => {},
    } as unknown as FakeRuntime,
    scheduled,
    delays,
  };
}

describe("idleAddon (deterministic)", () => {
  test("applyToRuntime defines .idle with a requestIdleCallback/cancelIdleCallback facade", () => {
    const { runtime } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.idle).toStrictEqual({
      requestIdleCallback: expect.any(Function),
      cancelIdleCallback: expect.any(Function),
    });
  });

  test("applyToRuntime wires .idle to the runtime's own timers, with the default 1ms idle delay", () => {
    const { runtime, scheduled, delays } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    (runtime.idle as IdleFacade).requestIdleCallback(() => {});
    expect(scheduled.size).toBe(1);
    expect(delays).toStrictEqual([1]);
  });

  test("withIdleDelay configures the delay requestIdleCallback schedules with", () => {
    const instance = addonBuilderFactory().withIdleDelay(100).create();
    const { runtime, delays } = fakeDeterministicRuntime();
    instance.applyToRuntime(runtime);
    (runtime.idle as IdleFacade).requestIdleCallback(() => {});
    expect(delays).toStrictEqual([100]);
  });

  test("withIdleDelay returns the same builder, for chaining", () => {
    const builder = addonBuilderFactory();
    expect(builder.withIdleDelay(100)).toBe(builder);
  });

  test("cancelIdleCallback disposes the underlying scheduled handle", () => {
    const { runtime, scheduled } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    const facade = runtime.idle as IdleFacade;
    const handle = facade.requestIdleCallback(() => {});
    expect(scheduled.size).toBe(1);
    facade.cancelIdleCallback(handle);
    expect(scheduled.size).toBe(0);
  });

  test.each([50, 250])(
    "addon() returns an independent builder each call - configuring one never affects another",
    (delayMs: number) => {
      const defaultDelayMs = 1;
      const configured = addonBuilderFactory().withIdleDelay(delayMs).create();
      const untouched = addonBuilderFactory().create();

      const { runtime: configuredRuntime, delays: configuredDelays } = fakeDeterministicRuntime();
      configured.applyToRuntime(configuredRuntime);
      (configuredRuntime.idle as IdleFacade).requestIdleCallback(() => {});

      const { runtime: untouchedRuntime, delays: untouchedDelays } = fakeDeterministicRuntime();
      untouched.applyToRuntime(untouchedRuntime);
      (untouchedRuntime.idle as IdleFacade).requestIdleCallback(() => {});

      expect(configuredDelays).toStrictEqual([delayMs]);
      expect(untouchedDelays).toStrictEqual([defaultDelayMs]);
    },
  );

  test.each([50, 250])(
    "create() returns an independent scheduler each call from the same configured builder",
    (delayMs: number) => {
      const builder = addonBuilderFactory().withIdleDelay(delayMs);
      const first = builder.create();
      const second = builder.create();
      expect(first).not.toBe(second);

      const { runtime: firstRuntime, delays: firstDelays } = fakeDeterministicRuntime();
      first.applyToRuntime(firstRuntime);
      (firstRuntime.idle as IdleFacade).requestIdleCallback(() => {});

      const { runtime: secondRuntime, delays: secondDelays } = fakeDeterministicRuntime();
      second.applyToRuntime(secondRuntime);
      (secondRuntime.idle as IdleFacade).requestIdleCallback(() => {});

      expect(firstDelays).toStrictEqual([delayMs]);
      expect(secondDelays).toStrictEqual([delayMs]);
    },
  );
});
