import { describe, expect, test } from "vite-plus/test";
import type { IAddon, IRuntime } from "@time-provider/core";
import { addon as addonBuilderFactory } from "../src/index.ts";
import "./polyfills.ts";

type FakeRuntime = IRuntime<unknown> & {
  scheduler: { idle?: unknown };
  compat?: {
    requestIdleCallback?: unknown;
    cancelIdleCallback?: (handle: { dispose: () => void }) => void;
  };
};

/*
 * applyToRuntime only touches what it's documented to (define `.idle`), so a minimal object
 * satisfies it for a focused unit test without needing a real plugin/runtime - the cast is safe
 * because these tests never exercise anything else on the fake runtime.
 */
function fakeSystemRuntime(): FakeRuntime {
  return {
    scheduler: {},
    registerAddon: (_addon: IAddon<unknown>) => {},
  } as FakeRuntime;
}

describe("idleAddon (system)", () => {
  test("applyToRuntime defines .idle with a request facade", () => {
    const runtime = fakeSystemRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.scheduler.idle).toStrictEqual({
      request: expect.any(Function),
    });
  });

  test("applyToRuntime adds the native-shaped aliases when a compat facade is there", () => {
    const runtime = fakeSystemRuntime();
    runtime.compat = {};
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.compat).toStrictEqual({
      requestIdleCallback: expect.any(Function),
      cancelIdleCallback: expect.any(Function),
    });
  });

  test("applyToRuntime leaves the aliases out when no compat facade is there", () => {
    const runtime = fakeSystemRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    expect(runtime.compat).toBeUndefined();
  });

  test("cancelIdleCallback disposes the handle it is given", () => {
    const runtime = fakeSystemRuntime();
    runtime.compat = {};
    addonBuilderFactory().create().applyToRuntime(runtime);
    let disposed = false;
    runtime.compat.cancelIdleCallback!({ dispose: () => (disposed = true) });
    expect(disposed).toBe(true);
  });

  test("applyToRuntime's defined property is enumerable but not writable", () => {
    const runtime = fakeSystemRuntime();
    addonBuilderFactory().create().applyToRuntime(runtime);
    const descriptor = Object.getOwnPropertyDescriptor(runtime.scheduler, "idle");
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.writable).toBe(false);
  });

  test("addon() returns an independent builder each call", () => {
    const first = addonBuilderFactory().create();
    const second = addonBuilderFactory().create();
    expect(first).not.toBe(second);
    const runtime = fakeSystemRuntime();
    second.applyToRuntime(runtime);
    expect(runtime.scheduler.idle).toStrictEqual({
      request: expect.any(Function),
    });
  });
});
