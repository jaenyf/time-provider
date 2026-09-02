import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import type { IRuntime } from "@time-provider/core";
import { SystemAnimationFrameScheduler } from "../src/system-animation-frame-scheduler.ts";

describe("SystemAnimationFrameScheduler", () => {
  function removeAnimationFrameAPI() {
    delete (globalThis as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame;
    delete (globalThis as unknown as { cancelAnimationFrame?: unknown }).cancelAnimationFrame;
  }

  function fakeRuntime(): IRuntime<unknown> {
    return {
      registerAddon: () => {},
    } as unknown as IRuntime<unknown>;
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

    describe("addon initialization", () => {
      test("throws when addon has not been initialized", () => {
        using sut = new SystemAnimationFrameScheduler();
        expect(() => {
          using _handle = sut.scheduleFrame(() => {});
        }).toThrow();
      });
      test("does not throw when addon has been initialized", () => {
        using sut = new SystemAnimationFrameScheduler();
        sut.applyToRuntime(fakeRuntime());
        expect(() => {
          using _handle = sut.scheduleFrame(() => {});
        }).not.toThrow();
      });
    });

    describe("addon facade", () => {
      test("applyToRuntime exposes a dedicated facade property on the runtime", () => {
        using sut = new SystemAnimationFrameScheduler();
        const runtime = fakeRuntime() as IRuntime<unknown> & { animation?: unknown };
        sut.applyToRuntime(runtime);
        expect(runtime.animation).toBeDefined();
      });
      test("the facade does not recursively re-expose itself", () => {
        using sut = new SystemAnimationFrameScheduler();
        const runtime = fakeRuntime() as IRuntime<unknown> & {
          animation?: { animation?: unknown };
        };
        sut.applyToRuntime(runtime);
        expect(runtime.animation?.animation).toBeUndefined();
      });
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

    describe("SystemAnimationFrameHandle", () => {
      describe("dispose", () => {
        test("dispose is idempotent", () => {
          using sut = new SystemAnimationFrameScheduler();
          sut.applyToRuntime(fakeRuntime());
          const handle = sut.scheduleFrame(() => {});
          handle.dispose();
          handle.dispose();
          handle.dispose();
          handle.dispose();
          expect(handle.isDisposed).toBe(true);
        });
        test("isDisposed is true when the handle has been disposed", () => {
          using sut = new SystemAnimationFrameScheduler();
          sut.applyToRuntime(fakeRuntime());
          const handle = sut.scheduleFrame(() => {});
          handle.dispose();
          expect(handle.isDisposed).toBe(true);
        });
        test("isDisposed is false when the handle has not yet been disposed", () => {
          using sut = new SystemAnimationFrameScheduler();
          sut.applyToRuntime(fakeRuntime());
          using handle = sut.scheduleFrame(() => {});
          expect(handle.isDisposed).toBe(false);
        });
      });
      describe("abort", () => {
        test("handle is not aborted by default", () => {
          using sut = new SystemAnimationFrameScheduler();
          sut.applyToRuntime(fakeRuntime());
          using handle = sut.scheduleFrame(() => {});
          expect(handle.signal.aborted).toBe(false);
        });
        test("handle can be aborted", () => {
          using sut = new SystemAnimationFrameScheduler();
          sut.applyToRuntime(fakeRuntime());
          using handle = sut.scheduleFrame(() => {});
          handle.signal.dispatchEvent(new Event("abort"));
          expect(handle.signal.aborted).toBe(true);
        });
        test("abort does not throws when the handle is being disposed", () => {
          using sut = new SystemAnimationFrameScheduler();
          sut.applyToRuntime(fakeRuntime());
          using handle = sut.scheduleFrame(() => {});
          handle.dispose();
          handle.signal.dispatchEvent(new Event("abort"));
          expect(handle.signal.aborted).toBe(true);
        });
      });
    });

    test("delegates requestAnimationFrame to the native function", () => {
      const sut = new SystemAnimationFrameScheduler();
      sut.applyToRuntime(fakeRuntime());
      let called = false;
      sut.scheduleFrame(() => (called = true));
      expect(calls.size).toBe(1);
      [...calls.values()][0]?.();
      expect(called).toBe(true);
    });
    test("disposing handle delegates cancelAnimationFrame to the native function", () => {
      const sut = new SystemAnimationFrameScheduler();
      sut.applyToRuntime(fakeRuntime());
      const handle = sut.scheduleFrame(() => {});
      handle.dispose();
      expect(calls.has(handle as unknown as number)).toBe(false);
    });
  });
});
