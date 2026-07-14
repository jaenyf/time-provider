import { expect, test, describe } from "vite-plus/test";
import type { IScheduler } from "@time-provider/core";

export function testScheduler(createSUT: () => IScheduler) {
  describe("setTimeout", () => {
    test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.setTimeout(immediateDelay, callbackA);
      sut.setTimeout(immediateDelay, callbackB);
      expect(callbackACalled).toBe(true);
      expect(callbackBCalled).toBe(true);
    });
    test.each([1, 20, 100])("ignore future callback", (futureDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.setTimeout(futureDelay, callbackA);
      sut.setTimeout(futureDelay, callbackB);
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
      sut.setInterval(immediateDelay, callbackA);
      sut.setInterval(immediateDelay, callbackB);
      expect(callbackACalled).toBe(true);
      expect(callbackBCalled).toBe(true);
    });
    test.each([1, 20, 100])("ignore future callbacks", (futureDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.setInterval(futureDelay, callbackA);
      sut.setInterval(futureDelay, callbackB);
      expect(callbackACalled).toBe(false);
      expect(callbackBCalled).toBe(false);
    });
  });
}
