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
  describe("clearTimeout", () => {
    describe("issue#120", () => {
      test.each([undefined, null])(
        "does not throw when clearing an undefined or null handle",
        (undefinedHandle) => {
          const sut = createSUT();
          expect(() => sut.clearTimeout(undefinedHandle as never)).not.toThrow();
        },
      );
      test("does not throw when clearing a handle obtained from a different scheduling method", () => {
        const sut = createSUT();
        const intervalHandle = sut.setInterval(() => {}, 1000);
        const recurringHandle = sut.setRecurring(() => false, 1000);
        expect(() => sut.clearTimeout(intervalHandle)).not.toThrow();
        expect(() => sut.clearTimeout(recurringHandle)).not.toThrow();
      });
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
  describe("clearInterval", () => {
    describe("issue#120", () => {
      test.each([undefined, null])(
        "does not throw when clearing an undefined or null handle",
        (undefinedHandle) => {
          const sut = createSUT();
          expect(() => sut.clearInterval(undefinedHandle as never)).not.toThrow();
        },
      );
      test("does not throw when clearing a handle obtained from a different scheduling method", () => {
        const sut = createSUT();
        const timeoutHandle = sut.setTimeout(() => {}, 1000);
        const recurringHandle = sut.setRecurring(() => false, 1000);
        expect(() => sut.clearInterval(timeoutHandle)).not.toThrow();
        expect(() => sut.clearInterval(recurringHandle)).not.toThrow();
      });
    });
  });
  describe("setRecurring", () => {
    test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      sut.setRecurring(() => {
        callbackACalled = true;
        return false;
      }, immediateDelay);
      sut.setRecurring(() => {
        callbackBCalled = true;
        return false;
      }, immediateDelay);
      expect(callbackACalled).toBe(!isTimeFrozen);
      expect(callbackBCalled).toBe(!isTimeFrozen);
    });
    test.each([1, 20, 100])("ignore future callback", (futureDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      sut.setRecurring(() => {
        callbackACalled = true;
        return false;
      }, futureDelay);
      sut.setRecurring(() => {
        callbackBCalled = true;
        return false;
      }, futureDelay);
      expect(callbackACalled).toBe(false);
      expect(callbackBCalled).toBe(false);
    });
    describe("issue#131", () => {
      test("0 is a real delay, not the stop signal - only false stops it", () => {
        const sut = createSUT();
        let runs = 0;
        // an ever-repeating 0 delay still runs (like an immediate setTimeout/setInterval would);
        // it would run zero times if 0 were mistaken for a falsy "stop"
        sut.setRecurring(() => {
          runs++;
          return 0;
        }, 0);
        expect(runs).toBe(isTimeFrozen ? 0 : 1);
      });
    });
  });
  describe("clearRecurring", () => {
    describe("issue#120", () => {
      test.each([undefined, null])(
        "does not throw when clearing an undefined or null handle",
        (undefinedHandle) => {
          const sut = createSUT();
          expect(() => sut.clearRecurring(undefinedHandle as never)).not.toThrow();
        },
      );
      test("does not throw when clearing a handle obtained from a different scheduling method", () => {
        const sut = createSUT();
        const timeoutHandle = sut.setTimeout(() => {}, 1000);
        const intervalHandle = sut.setInterval(() => {}, 1000);
        expect(() => sut.clearRecurring(timeoutHandle)).not.toThrow();
        expect(() => sut.clearRecurring(intervalHandle)).not.toThrow();
      });
    });
  });
}
