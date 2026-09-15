import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  type IAddon,
  type IRuntime,
  type IScheduledHandle,
  type ITimers,
} from "@time-provider/core";
import { addon as addonBuilderFactory } from "../src/deterministic.ts";

type FakeRuntime = IRuntime<unknown> & {
  idle?: unknown;
  advance(options: { milliseconds: number }): void;
};
type IdleFacade = {
  request: (callback: () => void) => IScheduledHandle;
  drain: (maxCount?: number) => number;
};

/*
 * applyToRuntime only touches what it's documented to (define `.idle`, use `.timers.once` and
 * `.advance`), so a minimal object satisfies it for a focused unit test without needing a real
 * plugin/runtime - the cast is safe because these tests never exercise anything else on the fake
 * runtime. `advance` simulates elapsed time by firing every scheduled entry whose delay is now
 * covered, matching a real manual runtime's `once()`/`advance()` relationship closely enough for
 * this placeholder `drain` implementation.
 */
function fakeDeterministicRuntime(): {
  runtime: FakeRuntime;
  scheduled: Map<number, () => void>;
  delays: number[];
} {
  const scheduled = new Map<number, { delay: number; callback: () => void }>();
  const delays: number[] = [];
  let nextHandle = 1;
  let elapsed = 0;
  const timers: ITimers = {
    once(delay, callback) {
      const delayMs = toDuration(delay);
      delays.push(delayMs);
      const handle = nextHandle++;
      scheduled.set(handle, { delay: elapsed + delayMs, callback });
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
      advance: (options: { milliseconds: number }) => {
        elapsed += options.milliseconds;
        for (const [handle, entry] of scheduled) {
          if (entry.delay <= elapsed) {
            scheduled.delete(handle);
            entry.callback();
          }
        }
      },
    } as unknown as FakeRuntime,
    scheduled: scheduled as unknown as Map<number, () => void>,
    delays,
  };
}

describe("idleAddon (deterministic)", () => {
  test("applyToRuntime defines .idle with a request/drain facade", () => {
    const { runtime } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.idle).toStrictEqual({
      request: expect.any(Function),
      drain: expect.any(Function),
    });
  });

  test("applyToRuntime wires .idle to the runtime's own timers, with the default 1ms idle delay", () => {
    const { runtime, scheduled, delays } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    (runtime.idle as IdleFacade).request(() => {});
    expect(scheduled.size).toBe(1);
    expect(delays).toStrictEqual([1]);
  });

  test("withIdleDelay configures the delay request schedules with", () => {
    const instance = addonBuilderFactory().withIdleDelay(100).create();
    const { runtime, delays } = fakeDeterministicRuntime();
    instance.applyToRuntime(runtime);
    (runtime.idle as IdleFacade).request(() => {});
    expect(delays).toStrictEqual([100]);
  });

  test("withIdleDelay returns the same builder, for chaining", () => {
    const builder = addonBuilderFactory();
    expect(builder.withIdleDelay(100)).toBe(builder);
  });

  test("disposing the returned handle cancels the underlying scheduled handle", () => {
    const { runtime, scheduled } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    const facade = runtime.idle as IdleFacade;
    const handle = facade.request(() => {});
    expect(scheduled.size).toBe(1);
    handle.dispose();
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
      (configuredRuntime.idle as IdleFacade).request(() => {});

      const { runtime: untouchedRuntime, delays: untouchedDelays } = fakeDeterministicRuntime();
      untouched.applyToRuntime(untouchedRuntime);
      (untouchedRuntime.idle as IdleFacade).request(() => {});

      expect(configuredDelays).toStrictEqual([delayMs]);
      expect(untouchedDelays).toStrictEqual([defaultDelayMs]);
    },
  );

  describe("drain (placeholder implementation)", () => {
    test("fires pending requests by advancing the clock", () => {
      const { runtime } = fakeDeterministicRuntime();
      addonBuilderFactory().create().applyToRuntime(runtime);
      const facade = runtime.idle as IdleFacade;
      let called = false;
      facade.request(() => (called = true));
      expect(called).toBe(false);

      facade.drain();

      expect(called).toBe(true);
    });

    test("returns how many callbacks ran", () => {
      const { runtime } = fakeDeterministicRuntime();
      addonBuilderFactory().create().applyToRuntime(runtime);
      const facade = runtime.idle as IdleFacade;
      facade.request(() => {});
      facade.request(() => {});

      expect(facade.drain()).toBe(2);
    });

    test("advances by maxCount milliseconds when given", () => {
      const { runtime } = fakeDeterministicRuntime();
      const advanceCalls: number[] = [];
      runtime.advance = ((options: { milliseconds: number }) => {
        advanceCalls.push(options.milliseconds);
      }) as FakeRuntime["advance"];
      addonBuilderFactory().create().applyToRuntime(runtime);
      (runtime.idle as IdleFacade).drain(42);

      expect(advanceCalls).toStrictEqual([42]);
    });

    test("advances by the configured idleDelay when maxCount is omitted", () => {
      const { runtime } = fakeDeterministicRuntime();
      const advanceCalls: number[] = [];
      runtime.advance = ((options: { milliseconds: number }) => {
        advanceCalls.push(options.milliseconds);
      }) as FakeRuntime["advance"];
      addonBuilderFactory().withIdleDelay(77).create().applyToRuntime(runtime);
      (runtime.idle as IdleFacade).drain();

      expect(advanceCalls).toStrictEqual([77]);
    });

    test("is a safe no-op returning 0 when the runtime has no advance()", () => {
      const { runtime } = fakeDeterministicRuntime();
      const runtimeWithoutAdvance = { ...runtime, advance: undefined } as unknown as FakeRuntime;
      addonBuilderFactory().create().applyToRuntime(runtimeWithoutAdvance);
      const facade = runtimeWithoutAdvance.idle as IdleFacade;
      let called = false;
      facade.request(() => (called = true));

      expect(() => facade.drain()).not.toThrow();
      expect(facade.drain()).toBe(0);
      expect(called).toBe(false);
    });
  });

  test.each([50, 250])(
    "create() returns an independent scheduler each call from the same configured builder",
    (delayMs: number) => {
      const builder = addonBuilderFactory().withIdleDelay(delayMs);
      const first = builder.create();
      const second = builder.create();
      expect(first).not.toBe(second);

      const { runtime: firstRuntime, delays: firstDelays } = fakeDeterministicRuntime();
      first.applyToRuntime(firstRuntime);
      (firstRuntime.idle as IdleFacade).request(() => {});

      const { runtime: secondRuntime, delays: secondDelays } = fakeDeterministicRuntime();
      second.applyToRuntime(secondRuntime);
      (secondRuntime.idle as IdleFacade).request(() => {});

      expect(firstDelays).toStrictEqual([delayMs]);
      expect(secondDelays).toStrictEqual([delayMs]);
    },
  );
});
