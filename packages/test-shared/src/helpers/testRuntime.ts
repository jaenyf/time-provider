import { expect, test, describe } from "vite-plus/test";
import {
  asap,
  type IRuntime,
  type IScheduledHandle,
  type IUtcOnlyRuntime,
} from "@time-provider/core";

export function testRuntime<TDate>(createSUT: () => IRuntime<TDate> | IUtcOnlyRuntime<TDate>) {
  describe("dispose", () => {
    test("calling explicit dispose multiple times does not throw", () => {
      const sut = createSUT();
      sut.dispose();
      sut.dispose();
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("signal notifies runtime disposal", () => {
      const sut = createSUT();
      let abortSignaled = false;
      sut.signal.addEventListener("abort", () => {
        abortSignaled = true;
      });
      sut.dispose();
      expect(abortSignaled).toBe(true);
    });
    test("signal is aborted after runtime disposal", () => {
      const sut = createSUT();
      sut.dispose();
      expect(sut.signal.aborted).toBe(true);
    });
    test("calling explicit dispose makes instance disposed", () => {
      const sut = createSUT();
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });
    test("using implicit dispose makes instance disposed", () => {
      let runtimeRef: IRuntime<TDate> | IUtcOnlyRuntime<TDate> | undefined = undefined;
      {
        using sut = createSUT();
        runtimeRef = sut;
      }
      expect(runtimeRef.isDisposed).toBe(true);
    });
  });
  describe("abort", () => {
    test("signal is not declared aborted by default", () => {
      const sut = createSUT();
      expect(sut.signal.aborted).toBe(false);
    });
    test("disposing makes signal aborted", () => {
      const sut = createSUT();
      sut.dispose();
      expect(sut.signal.aborted).toBe(true);
    });
    test("signaling abortion on lazyloaded disposes the handle", () => {
      const sut = createSUT();
      sut.signal.dispatchEvent(new Event("abort"));
      expect(sut.signal.aborted).toBe(true);
      expect(sut.isDisposed).toBe(true);
    });
    test("signaling abortion on non lazy-loaded disposes the handle", () => {
      const sut = createSUT();
      const lazyLoad = sut.signal; //trigger the lazy load;
      sut.signal.dispatchEvent(new Event("abort"));
      expect(lazyLoad).not.toBe(undefined);
      expect(sut.signal.aborted).toBe(true);
      expect(sut.isDisposed).toBe(true);
    });
  });

  test("calling explicit dispose also dispose created once-handles", () => {
    const sut = createSUT();
    const handle = sut.once(asap(), () => {});
    sut.dispose();
    expect(handle.isDisposed).toBe(true);
  });
  test("using implicit dispose also dispose created once-handles", () => {
    let handleRef: IScheduledHandle | undefined = undefined;
    {
      using sut = createSUT();
      handleRef = sut.once(asap(), () => {});
    }
    expect(handleRef.isDisposed).toBe(true);
  });

  test("calling explicit dispose also dispose created every-handles", () => {
    const sut = createSUT();
    const handle = sut.every(asap(), () => {});
    sut.dispose();
    expect(handle.isDisposed).toBe(true);
  });
  test("using implicit dispose also dispose created every-handles", () => {
    let handleRef: IScheduledHandle | undefined = undefined;
    {
      using sut = createSUT();
      handleRef = sut.every(asap(), () => {});
    }
    expect(handleRef.isDisposed).toBe(true);
  });

  test("calling explicit dispose also dispose created recurring-handles", () => {
    const sut = createSUT();
    const handle = sut.recurring(() => {
      return { milliseconds: 10 };
    }, asap());
    sut.dispose();
    expect(handle.isDisposed).toBe(true);
  });
  test("using implicit dispose also dispose created recurring-handles", () => {
    let handleRef: IScheduledHandle | undefined = undefined;
    {
      using sut = createSUT();
      handleRef = sut.recurring(() => {
        return { milliseconds: 10 };
      }, asap());
    }
    expect(handleRef.isDisposed).toBe(true);
  });
}
