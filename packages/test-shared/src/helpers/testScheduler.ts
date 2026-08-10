import { expect, test, describe } from "vite-plus/test";
import type { IDeterministicScheduler } from "@time-provider/core/deterministic";

export function testScheduler(
  createSUT: () => IDeterministicScheduler,
  isTimeFrozen: boolean = false,
) {
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
  describe("queueMicrotask", () => {
    test("does not run the callback in-line", () => {
      const sut = createSUT();
      let called = false;
      sut.queueMicrotask(() => (called = true));
      expect(called).toBe(false);
    });

    test("queued microtasks run in order, on the next drain", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queueMicrotask(() => log.push("m1"));
      sut.queueMicrotask(() => log.push("m2"));
      sut.drainMicrotasks();

      expect(log).toEqual(["m1", "m2"]);
    });

    test("a microtask queued by a microtask runs in the same drain", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queueMicrotask(() => {
        log.push("m1");
        sut.queueMicrotask(() => {
          log.push("m2");
          sut.queueMicrotask(() => log.push("m3"));
        });
      });
      sut.drainMicrotasks();

      expect(log).toEqual(["m1", "m2", "m3"]);
    });

    test("a microtask never runs twice, however many drains follow", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queueMicrotask(() => log.push("m1"));
      sut.drainMicrotasks();
      sut.drainMicrotasks();

      expect(log).toEqual(["m1"]);
    });

    test("draining an empty queue does not throw", () => {
      const sut = createSUT();
      expect(() => sut.drainMicrotasks()).not.toThrow();
    });
  });

  describe("microtask checkpoints around due callbacks", () => {
    /*
      Scheduling a callback runs a checkpoint too, whether or not it ever becomes due - a frozen
      clock has no due callback to hang one off, but still auto-drains on every schedule call.
    */
    test("a scheduling call auto-drains pending microtasks, frozen or not", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queueMicrotask(() => log.push("m1"));
      // A far-future delay: never due, on either a frozen or an advancing clock - only the
      // auto-drain that scheduling itself triggers can be responsible for m1 having run.
      sut.setTimeout(() => {}, 1_000_000);

      expect(log).toEqual(["m1"]);
    });

    /*
      A due callback is a task, and the host runs a microtask checkpoint at the end of every
      task - so a microtask queued by one due callback runs before the next one. A frozen clock
      never has a due callback to hang a checkpoint off, hence the guard.
    */
    test.skipIf(isTimeFrozen)(
      "a due callback's microtasks run before the next due callback",
      () => {
        const sut = createSUT();
        const log: string[] = [];
        sut.setTimeout(() => {
          log.push("t1");
          sut.queueMicrotask(() => log.push("m1"));
        }, 0);
        sut.setTimeout(() => log.push("t2"), 0);

        expect(log).toEqual(["t1", "m1", "t2"]);
      },
    );

    test.skipIf(isTimeFrozen)(
      "the checkpoint after a due callback runs nested microtasks too",
      () => {
        const sut = createSUT();
        const log: string[] = [];
        sut.setTimeout(() => {
          log.push("t1");
          sut.queueMicrotask(() => {
            log.push("m1");
            sut.queueMicrotask(() => log.push("m2"));
          });
        }, 0);
        sut.setTimeout(() => log.push("t2"), 0);

        expect(log).toEqual(["t1", "m1", "m2", "t2"]);
      },
    );

    test.skipIf(isTimeFrozen)("microtasks queued before a due callback run first", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queueMicrotask(() => log.push("m1"));
      sut.setTimeout(() => log.push("t1"), 0);

      expect(log).toEqual(["m1", "t1"]);
    });
  });
}
