import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import { SystemAnimationFrameScheduler } from "../src/system-animation-frame-scheduler.ts";

describe("SystemAnimationFrameScheduler", () => {
  function removeAnimationFrameAPI() {
    delete (globalThis as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame;
    delete (globalThis as unknown as { cancelAnimationFrame?: unknown }).cancelAnimationFrame;
  }

  describe("without a native animation-frame API (e.g. plain Node.js)", () => {
    describe("missing all methods", () => {
      beforeEach(() => {
        removeAnimationFrameAPI();
      });

      test("constructor throws a clear error when missing API", () => {
        expect(() => new SystemAnimationFrameScheduler()).toThrow(
          "Environment does not support Animation frame API (are you in a browser?)",
        );
      });
      describe("missing requestAnimationFrame method", () => {
        beforeEach(() => {
          removeAnimationFrameAPI();
          globalThis.cancelAnimationFrame = () => {};
        });
        afterEach(() => {
          removeAnimationFrameAPI();
        });
        test("constructor throws a clear error when missing API", () => {
          expect(() => new SystemAnimationFrameScheduler()).toThrow(
            "Environment does not support Animation frame API (are you in a browser?)",
          );
        });
      });
      describe("missing cancelAnimationFrame method", () => {
        beforeEach(() => {
          removeAnimationFrameAPI();
          globalThis.requestAnimationFrame = (_callback: FrameRequestCallback): number => 0;
        });
        afterEach(() => {
          removeAnimationFrameAPI();
        });
        test("constructor throws a clear error when missing API", () => {
          expect(() => new SystemAnimationFrameScheduler()).toThrow(
            "Environment does not support Animation frame API (are you in a browser?)",
          );
        });
      });
    });
  });

  describe("with a native requestAnimationFrame available", () => {
    let calls = new Map<number, () => void>();
    let nextHandle = 1;
    beforeEach(() => {
      calls = new Map();
      nextHandle = 1;
      (globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (
        callback: () => void,
      ) => {
        const handle = nextHandle++;
        calls.set(handle, callback);
        return handle;
      };
      (globalThis as unknown as { cancelAnimationFrame: unknown }).cancelAnimationFrame = (
        handle: number,
      ) => {
        calls.delete(handle);
      };
    });
    afterEach(() => {
      removeAnimationFrameAPI();
    });

    describe("dispose", () => {
      test("explicit dispose call disposes instance", () => {
        const sut = new SystemAnimationFrameScheduler();
        sut.dispose();
        expect(sut.isDisposed).toBe(true);
      });
      test("implicit dispose call disposes instance", () => {
        let sutRef: SystemAnimationFrameScheduler<unknown> | undefined = undefined;
        {
          using sut = new SystemAnimationFrameScheduler();
          sutRef = sut;
        }
        expect(sutRef.isDisposed).toBe(true);
      });
    });

    test("delegates requestAnimationFrame to the native function", () => {
      const sut = new SystemAnimationFrameScheduler();
      let called = false;
      sut.scheduleFrame(() => (called = true));
      expect(calls.size).toBe(1);
      [...calls.values()][0]?.();
      expect(called).toBe(true);
    });
    test("disposing handle delegates cancelAnimationFrame to the native function", () => {
      const sut = new SystemAnimationFrameScheduler();
      const handle = sut.scheduleFrame(() => {});
      sut.dispose();
      expect(calls.has(handle as unknown as number)).toBe(false);
    });
  });
});
