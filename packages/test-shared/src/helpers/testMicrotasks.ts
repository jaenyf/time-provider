import { expect, test, describe } from "vite-plus/test";
import type { ITimers } from "@time-provider/core";
import type { IDeterministicMicrotasks } from "@time-provider/core/deterministic";

export function testMicrotasks(
  createSUT: () => IDeterministicMicrotasks & Pick<ITimers, "once"> & { dispose(): void },
  isTimeFrozen: boolean = false,
) {
  describe("queue", () => {
    test("does not run the callback in-line", () => {
      const sut = createSUT();
      let called = false;
      sut.queue(() => (called = true));
      expect(called).toBe(false);
    });

    test("queued microtasks run in order, on the next drain", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queue(() => log.push("m1"));
      sut.queue(() => log.push("m2"));
      sut.drain();

      expect(log).toEqual(["m1", "m2"]);
    });

    test("a microtask queued by a microtask runs in the same drain", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queue(() => {
        log.push("m1");
        sut.queue(() => {
          log.push("m2");
          sut.queue(() => log.push("m3"));
        });
      });
      sut.drain();

      expect(log).toEqual(["m1", "m2", "m3"]);
    });

    test("a microtask never runs twice, however many drains follow", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queue(() => log.push("m1"));
      sut.drain();
      sut.drain();

      expect(log).toEqual(["m1"]);
    });

    test("draining an empty queue does not throw", () => {
      const sut = createSUT();
      expect(() => sut.drain()).not.toThrow();
    });

    test("disposing the runtime discards still-queued microtasks", () => {
      const sut = createSUT();
      let called = false;
      sut.queue(() => (called = true));

      sut.dispose();
      sut.drain();

      expect(called).toBe(false);
    });
  });

  describe("checkpoints around due callbacks", () => {
    /*
      Scheduling a callback runs a checkpoint too, whether or not it ever becomes due - a frozen
      clock has no due callback to hang one off, but still auto-drains on every schedule call.
    */
    test("a scheduling call auto-drains pending microtasks, frozen or not", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queue(() => log.push("m1"));
      // A far-future delay: never due, on either a frozen or an advancing clock - only the
      // auto-drain that scheduling itself triggers can be responsible for m1 having run.
      sut.once({ milliseconds: 1_000_000 }, () => {});

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
        sut.once({ milliseconds: 0 }, () => {
          log.push("t1");
          sut.queue(() => log.push("m1"));
        });
        sut.once({ milliseconds: 0 }, () => log.push("t2"));

        expect(log).toEqual(["t1", "m1", "t2"]);
      },
    );

    test.skipIf(isTimeFrozen)(
      "the checkpoint after a due callback runs nested microtasks too",
      () => {
        const sut = createSUT();
        const log: string[] = [];
        sut.once({ milliseconds: 0 }, () => {
          log.push("t1");
          sut.queue(() => {
            log.push("m1");
            sut.queue(() => log.push("m2"));
          });
        });
        sut.once({ milliseconds: 0 }, () => log.push("t2"));

        expect(log).toEqual(["t1", "m1", "m2", "t2"]);
      },
    );

    test.skipIf(isTimeFrozen)("microtasks queued before a due callback run first", () => {
      const sut = createSUT();
      const log: string[] = [];
      sut.queue(() => log.push("m1"));
      sut.once({ milliseconds: 0 }, () => log.push("t1"));

      expect(log).toEqual(["m1", "t1"]);
    });
  });
}
