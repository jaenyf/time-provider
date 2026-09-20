import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  ScheduledHandleKind,
  type IAddon,
  type IDurationSpec,
} from "@time-provider/core";
import type { IDeterministicRuntime } from "@time-provider/core/deterministic";
import { addon as addonBuilderFactory } from "../src/deterministic.ts";

type FakeRuntime = IDeterministicRuntime<unknown> & {
  scheduler: { idle?: unknown };
  compat?: {
    requestIdleCallback?: unknown;
    cancelIdleCallback?: (handle: { dispose: () => void }) => void;
  };
};
type IdleFacade = {
  request: (callback: () => void) => { dispose(): void };
  drain: (maxCount?: number) => number;
};

/*
 * applyToRuntime only touches what it's documented to (define `.idle`, use the runtime's
 * specific()/takeOutSpecificCallbacks() at request time), so a minimal fake satisfies it for a
 * focused unit test without needing a real plugin/runtime - the cast is safe because these tests
 * never exercise anything else on the fake runtime.
 */
function fakeDeterministicRuntime(): {
  runtime: FakeRuntime;
  registeredCount: () => number;
} {
  const entries: { tag: unknown; callback: () => void }[] = [];
  return {
    runtime: {
      scheduler: {},
      registerAddon: (_addon: IAddon<unknown>) => {},
      drain: () => {},
      specific(
        tag: unknown,
        _kind: ScheduledHandleKind,
        delay: IDurationSpec,
        callback: () => void,
      ) {
        expect(toDuration(delay)).toBeGreaterThan(0);
        const entry = { tag, callback };
        entries.push(entry);
        let disposed = false;
        const dispose = () => {
          if (disposed) return;
          disposed = true;
          const index = entries.indexOf(entry);
          if (index >= 0) entries.splice(index, 1);
        };
        return {
          dispose,
          get isDisposed() {
            return disposed;
          },
          [Symbol.dispose]: dispose,
          signal: new AbortController().signal,
        };
      },
      takeOutSpecificCallbacks(tag: unknown, maxCount: number): (() => void)[] {
        const callbacks: (() => void)[] = [];
        for (let i = 0; i < entries.length && callbacks.length < maxCount;) {
          if (entries[i].tag === tag) {
            callbacks.push(entries[i].callback);
            entries.splice(i, 1);
          } else {
            i++;
          }
        }
        return callbacks;
      },
    } as unknown as FakeRuntime,
    registeredCount: () => entries.length,
  };
}

describe("idleAddon (deterministic)", () => {
  test("applyToRuntime defines .idle with a request/drain facade", () => {
    const { runtime } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.scheduler.idle).toStrictEqual({
      request: expect.any(Function),
      drain: expect.any(Function),
    });
  });

  test("applyToRuntime adds the native-shaped aliases when a compat facade is there", () => {
    const { runtime } = fakeDeterministicRuntime();
    runtime.compat = {};
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.compat).toStrictEqual({
      requestIdleCallback: expect.any(Function),
      cancelIdleCallback: expect.any(Function),
    });
    let disposed = false;
    runtime.compat.cancelIdleCallback!({ dispose: () => (disposed = true) });
    expect(disposed).toBe(true);
  });

  test("applyToRuntime leaves the aliases out when no compat facade is there", () => {
    const { runtime } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.compat).toBeUndefined();
  });

  test("request() registers a real entry with the runtime immediately", () => {
    const { runtime, registeredCount } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    (runtime.scheduler.idle as IdleFacade).request(() => {});
    expect(registeredCount()).toBe(1);
  });

  test("drain() runs pending requests and removes them from the runtime", () => {
    const { runtime, registeredCount } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    let called = false;
    (runtime.scheduler.idle as IdleFacade).request(() => (called = true));

    (runtime.scheduler.idle as IdleFacade).drain();

    expect(called).toBe(true);
    expect(registeredCount()).toBe(0);
  });

  test("disposing the returned handle before drain prevents the callback from running", () => {
    const { runtime } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    const facade = runtime.scheduler.idle as IdleFacade;
    let called = false;
    const handle = facade.request(() => (called = true));
    handle.dispose();

    facade.drain();

    expect(called).toBe(false);
  });

  test("drain(maxCount) runs at most maxCount pending requests, oldest first", () => {
    const { runtime } = fakeDeterministicRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    const facade = runtime.scheduler.idle as IdleFacade;
    const order: number[] = [];
    facade.request(() => order.push(1));
    facade.request(() => order.push(2));
    facade.request(() => order.push(3));

    const ran = facade.drain(2);

    expect(ran).toBe(2);
    expect(order).toStrictEqual([1, 2]);
  });

  test("addon() returns an independent scheduler each call", () => {
    const first = addonBuilderFactory().create();
    const second = addonBuilderFactory().create();
    expect(first).not.toBe(second);

    const { runtime: firstRuntime, registeredCount: firstRegisteredCount } =
      fakeDeterministicRuntime();
    first.applyToRuntime(firstRuntime);
    (firstRuntime.scheduler.idle as IdleFacade).request(() => {});
    (firstRuntime.scheduler.idle as IdleFacade).drain();

    const { runtime: secondRuntime, registeredCount: secondRegisteredCount } =
      fakeDeterministicRuntime();
    second.applyToRuntime(secondRuntime);

    expect(firstRegisteredCount()).toBe(0);
    expect(secondRegisteredCount()).toBe(0);
  });
});
