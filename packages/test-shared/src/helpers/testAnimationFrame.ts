import { describe, test, expect } from "vite-plus/test";
import type { AnimationFrameHandle, IAnimationFrameScheduler } from "@time-provider/core";

export function testAnimationFrame(
  createSUT: () => { animation: IAnimationFrameScheduler },
  /**Animation API is only available in browser, the system runtime will throw if API is not detected */
  isSupportedByEnvironment: boolean = true,
) {
  describe.skipIf(isSupportedByEnvironment)("unsupported environment", () => {
    test("requestAnimationFrame throws", () => {
      const sut = createSUT();
      expect(() => sut.animation.requestAnimationFrame(() => {})).toThrow();
    });

    test("cancelAnimationFrame throws", () => {
      const sut = createSUT();
      expect(() =>
        sut.animation.cancelAnimationFrame(undefined as unknown as AnimationFrameHandle),
      ).toThrow();
    });
  });

  describe.skipIf(!isSupportedByEnvironment)("requestAnimationFrame", () => {
    test("does not invoke the callback synchronously upon registration", () => {
      /*
       * Unlike setTimeout/setInterval with a zero-or-negative delay, a freshly
       * registered animation frame is always due strictly in the future (now +
       * a host frame duration), so it can never fire as a side effect of
       * registration itself.
       */
      const sut = createSUT();
      let called = false;
      sut.animation.requestAnimationFrame(() => (called = true));
      expect(called).toBe(false);
    });
  });

  describe.skipIf(!isSupportedByEnvironment)("cancelAnimationFrame", () => {
    test("does not throw for a handle that has not fired yet", () => {
      const sut = createSUT();
      const handle = sut.animation.requestAnimationFrame(() => {});
      expect(() => sut.animation.cancelAnimationFrame(handle)).not.toThrow();
    });
  });
}
