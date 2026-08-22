import { describe, expect, test } from "vite-plus/test";
import { TimerHandle } from "../src/runtimes/timer-handle.ts";
import { IRuntime, IScheduledHandle, SCHEDULED_TIMER_KIND_TIMEOUT } from "../src/types/types.ts";

function createFakeRuntime(): IRuntime<unknown> {
  return { clearTimer(_handle) {} } as IRuntime<unknown>;
}

describe("timer-handle", () => {
  test("owner gets the corresponding owner", () => {
    const owner = {} as IRuntime<unknown>;
    const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, owner, undefined);
    expect(sut.owner).toBe(owner);
  });

  describe("dispose", () => {
    test("calling explicit dispose multiple times does not throw", () => {
      const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
      sut.dispose();
      sut.dispose();
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("signal notifies runtime disposal", () => {
      const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
      let abortSignaled = false;
      sut.signal.addEventListener("abort", () => {
        abortSignaled = true;
      });
      sut.dispose();
      expect(abortSignaled).toBe(true);
    });
    test("signal is aborted after runtime disposal", () => {
      const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
      sut.dispose();
      expect(sut.signal.aborted).toBe(true);
    });
    test("calling explicit dispose makes instance disposed", () => {
      const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("using implicit dispose makes instance disposed", () => {
      let runtimeRef: IScheduledHandle | undefined = undefined;
      {
        using sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
        runtimeRef = sut;
      }
      expect(runtimeRef.isDisposed).toBe(true);
    });
  });

  describe("abort", () => {
    test("signal is not declared aborted by default", () => {
      const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
      expect(sut.signal.aborted).toBe(false);
    });
    test("disposing makes signal aborted", () => {
      const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
      sut.dispose();
      expect(sut.signal.aborted).toBe(true);
    });
    test("signaling abortion on lazyloaded disposes the handle", () => {
      const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
      sut.signal.dispatchEvent(new Event("abort"));
      expect(sut.signal.aborted).toBe(true);
      expect(sut.isDisposed).toBe(true);
    });
    test("signaling abortion on non lazy-loaded disposes the handle", () => {
      const sut = new TimerHandle(SCHEDULED_TIMER_KIND_TIMEOUT, createFakeRuntime(), undefined);
      const lazyLoad = sut.signal; //trigger the lazy load;
      sut.signal.dispatchEvent(new Event("abort"));
      expect(lazyLoad).not.toBe(undefined);
      expect(sut.signal.aborted).toBe(true);
      expect(sut.isDisposed).toBe(true);
    });
  });
});
