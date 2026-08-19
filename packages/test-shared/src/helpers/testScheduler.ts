import { expect, test, describe } from "vite-plus/test";
import { asap, type ITimers } from "@time-provider/core";

export function testTimers(createSUT: () => ITimers, isTimeFrozen: boolean = false) {
  describe("once", () => {
    test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.once({ milliseconds: immediateDelay }, callbackA);
      sut.once({ milliseconds: immediateDelay }, callbackB);
      expect(callbackACalled).toBe(!isTimeFrozen);
      expect(callbackBCalled).toBe(!isTimeFrozen);
    });
    test.each([1, 20, 100])("ignore future callback", (futureDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.once({ milliseconds: futureDelay }, callbackA);
      sut.once({ milliseconds: futureDelay }, callbackB);
      expect(callbackACalled).toBe(false);
      expect(callbackBCalled).toBe(false);
    });
  });
  describe("every", () => {
    test.each([0, -1, -100])("executes immediate callbacks", (immediateDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.every({ milliseconds: immediateDelay }, callbackA);
      sut.every({ milliseconds: immediateDelay }, callbackB);
      expect(callbackACalled).toBe(!isTimeFrozen);
      expect(callbackBCalled).toBe(!isTimeFrozen);
    });
    test.each([1, 20, 100])("ignore future callbacks", (futureDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      const callbackA = () => (callbackACalled = true);
      const callbackB = () => (callbackBCalled = true);
      sut.every({ milliseconds: futureDelay }, callbackA);
      sut.every({ milliseconds: futureDelay }, callbackB);
      expect(callbackACalled).toBe(false);
      expect(callbackBCalled).toBe(false);
    });
  });

  describe("recurring", () => {
    test.each([0, -1, -100])("executes immediate callback", (immediateDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      sut.recurring(
        () => {
          callbackACalled = true;
          return false;
        },
        { milliseconds: immediateDelay },
      );
      sut.recurring(
        () => {
          callbackBCalled = true;
          return false;
        },
        { milliseconds: immediateDelay },
      );
      expect(callbackACalled).toBe(!isTimeFrozen);
      expect(callbackBCalled).toBe(!isTimeFrozen);
    });
    test.each([1, 20, 100])("ignore future callback", (futureDelay: number) => {
      const sut = createSUT();
      let callbackACalled = false;
      let callbackBCalled = false;
      sut.recurring(
        () => {
          callbackACalled = true;
          return false;
        },
        { milliseconds: futureDelay },
      );
      sut.recurring(
        () => {
          callbackBCalled = true;
          return false;
        },
        { milliseconds: futureDelay },
      );
      expect(callbackACalled).toBe(false);
      expect(callbackBCalled).toBe(false);
    });
    describe("issue#131", () => {
      test("0 is a real delay, not the stop signal - only false stops it", () => {
        const sut = createSUT();
        let runs = 0;
        // an ever-repeating 0 delay still runs (like an immediate setTimeout/setInterval would);
        // it would run zero times if 0 were mistaken for a falsy "stop"
        sut.recurring(() => {
          runs++;
          return asap();
        }, asap());
        expect(runs).toBe(isTimeFrozen ? 0 : 1);
      });
    });
    test("fires asap when no initial delay specified", () => {
      const sut = createSUT();
      let runs = 0;
      sut.recurring(() => {
        runs++;
        return asap();
      });
      expect(runs).toBe(isTimeFrozen ? 0 : 1);
    });
  });
}
