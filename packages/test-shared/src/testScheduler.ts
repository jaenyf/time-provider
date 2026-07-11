import { expect, test, describe } from "vite-plus/test";
import type { IScheduler } from "@time-provider/core";

export function testScheduler(createSUT: () => IScheduler) {
  describe("setTimeout", () => {
    test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
      const sut = createSUT();
      let callbackCalled = false;
      const callback = () => (callbackCalled = true);
      sut.setTimeout(immediateDelay, callback);
      expect(callbackCalled).toBe(true);
    });
    test.each([1, 20, 100])("ignore future callback", (futureDelay: number) => {
      const sut = createSUT();
      let callbackCalled = false;
      const callback = () => (callbackCalled = true);
      sut.setTimeout(futureDelay, callback);
      expect(callbackCalled).toBe(false);
    });
  });
}
