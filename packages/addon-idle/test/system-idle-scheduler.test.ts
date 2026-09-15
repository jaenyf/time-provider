import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import type { IRuntime } from "@time-provider/core";
import { SystemIdleScheduler } from "../src/system-idle-scheduler.ts";

const NOT_SUPPORTED = "Environment does not support the Idle Callback API (are you in Safari?)";

function fakeRuntime(): IRuntime<unknown> {
  return {
    registerAddon: () => {},
  } as unknown as IRuntime<unknown>;
}

describe("SystemIdleScheduler", () => {
  function removeIdleAPI() {
    delete (globalThis as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
    delete (globalThis as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback;
  }

  describe("without a native idle callback API (e.g. Safari)", () => {
    afterEach(() => {
      removeIdleAPI();
    });

    test("constructor throws a clear error when both methods are missing", () => {
      removeIdleAPI();
      expect(() => new SystemIdleScheduler()).toThrow(NOT_SUPPORTED);
    });

    test("constructor throws a clear error when only requestIdleCallback is missing", () => {
      removeIdleAPI();
      globalThis.cancelIdleCallback = () => {};
      expect(() => new SystemIdleScheduler()).toThrow(NOT_SUPPORTED);
    });

    test("constructor throws a clear error when only cancelIdleCallback is missing", () => {
      removeIdleAPI();
      (globalThis as unknown as { requestIdleCallback: unknown }).requestIdleCallback = () => 0;
      expect(() => new SystemIdleScheduler()).toThrow(NOT_SUPPORTED);
    });
  });

  describe("with a native idle callback API available", () => {
    let calls = new Map<number, () => void>();
    let nextHandle = 1;
    beforeEach(() => {
      calls = new Map();
      nextHandle = 1;
      (globalThis as unknown as { requestIdleCallback: unknown }).requestIdleCallback = (
        callback: () => void,
      ) => {
        const handle = nextHandle++;
        calls.set(handle, callback);
        return handle;
      };
      (globalThis as unknown as { cancelIdleCallback: unknown }).cancelIdleCallback = (
        handle: number,
      ) => {
        calls.delete(handle);
      };
    });
    afterEach(() => {
      removeIdleAPI();
    });

    describe("dispose", () => {
      test("explicit dispose call disposes instance", () => {
        const sut = new SystemIdleScheduler();
        sut.dispose();
        expect(sut.isDisposed).toBe(true);
      });
      test("implicit dispose call disposes instance", () => {
        let sutRef: SystemIdleScheduler<unknown> | undefined = undefined;
        {
          using sut = new SystemIdleScheduler();
          sutRef = sut;
        }
        expect(sutRef.isDisposed).toBe(true);
      });
    });

    describe("addon facade", () => {
      test("applyToRuntime exposes a dedicated facade property on the runtime", () => {
        using sut = new SystemIdleScheduler();
        const runtime = fakeRuntime() as IRuntime<unknown> & { idle?: unknown };
        sut.applyToRuntime(runtime);
        expect(runtime.idle).toBeDefined();
      });
    });

    test("delegates requestIdleCallback to the native function", () => {
      const sut = new SystemIdleScheduler();
      let called = false;
      sut.requestIdleCallback(() => (called = true));
      expect(calls.size).toBe(1);
      [...calls.values()][0]?.();
      expect(called).toBe(true);
    });
    test("disposing the returned handle delegates to the native cancelIdleCallback", () => {
      const sut = new SystemIdleScheduler();
      const handle = sut.requestIdleCallback(() => {});
      expect(calls.size).toBe(1);
      handle.dispose();
      expect(calls.size).toBe(0);
    });
    test("disposing the returned handle is a no-op the second time", () => {
      const sut = new SystemIdleScheduler();
      const handle = sut.requestIdleCallback(() => {});
      handle.dispose();
      expect(() => handle.dispose()).not.toThrow();
      expect(handle.isDisposed).toBe(true);
    });
  });
});
