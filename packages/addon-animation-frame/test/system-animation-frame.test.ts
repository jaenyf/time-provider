import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import { SystemAnimationFrameScheduler } from "../src/system-animation-frame.ts";

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

    test("delegates requestAnimationFrame to the native function", () => {
      const sut = new SystemAnimationFrameScheduler();
      let called = false;
      sut.requestAnimationFrame(() => (called = true));
      expect(calls.size).toBe(1);
      [...calls.values()][0]?.();
      expect(called).toBe(true);
    });
    test("delegates cancelAnimationFrame to the native function", () => {
      const sut = new SystemAnimationFrameScheduler();
      const handle = sut.requestAnimationFrame(() => {});
      sut.cancelAnimationFrame(handle);
      expect(calls.has(handle as unknown as number)).toBe(false);
    });
  });
});
