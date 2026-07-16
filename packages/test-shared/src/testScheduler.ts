import { expect, test, describe } from "vite-plus/test";
import type { IScheduler } from "@time-provider/core";

export function testScheduler(createSUT: () => IScheduler, isTimeFrozen: boolean = false) {
  describe("setTimeout", () => {
    test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.setTimeout(callbackA, immediateDelay);
      sut.setTimeout(callbackB, immediateDelay);
      expect(callbackACalled).toBe(!isTimeFrozen);
      expect(callbackBCalled).toBe(!isTimeFrozen);
    });
    test.each([1, 20, 100])("ignore future callback", (futureDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.setTimeout(callbackA, futureDelay);
      sut.setTimeout(callbackB, futureDelay);
      expect(callbackACalled).toBe(false);
      expect(callbackBCalled).toBe(false);
    });
  });
  describe("setInterval", () => {
    test.each([0, -1, -100])("executes immediate callbacks", (immediateDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.setInterval(callbackA, immediateDelay);
      sut.setInterval(callbackB, immediateDelay);
      expect(callbackACalled).toBe(!isTimeFrozen);
      expect(callbackBCalled).toBe(!isTimeFrozen);
    });
    test.each([1, 20, 100])("ignore future callbacks", (futureDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.setInterval(callbackA, futureDelay);
      sut.setInterval(callbackB, futureDelay);
      expect(callbackACalled).toBe(false);
      expect(callbackBCalled).toBe(false);
    });
  });
}
