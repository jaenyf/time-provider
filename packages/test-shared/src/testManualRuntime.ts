import { expect, test, describe } from "vite-plus/test";
import type {
  IDeterministicPlugin,
  IUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import { testTimers } from "./helpers/testScheduler.ts";
import { testParser } from "./helpers/testParser.ts";
import { testPerformance } from "./helpers/testPerformance.ts";
import {
  testConstructorArgs,
  testWithTimezone,
  testLocalNow,
  testUtcNow,
  testTimestampNow,
  getDeterministicBuilderFor,
} from "./helpers/testHelpers.ts";
import { asap, toDuration, type ITimerHandle, type TimezoneDefinition } from "@time-provider/core";
import { testAddonCronManual } from "./helpers/testCron.ts";

export function testManualRuntime<TDate>(
  plugin: IDeterministicPlugin<TDate> | IUtcOnlyDeterministicPlugin<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  const createManualRuntime = (
    timezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ) =>
    plugin.supportsLocalTime
      ? plugin.createManualRuntime(timezone, initialTime)
      : plugin.createManualRuntime(initialTime);

  const createSUT = () => createManualRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");

  testConstructorArgs(
    "createManualRuntime",
    createSUT,
    (initialTime) => createManualRuntime("Pacific/Kiritimati", initialTime),
    parseTimeToUtc,
  );

  describe("manual", () => {
    testLocalNow(plugin.supportsLocalTime, createSUT, () =>
      parseTimeToLocal("2026-01-01T14:00+14:00"),
    );
    testWithTimezone<TDate>(plugin.supportsLocalTime, createSUT);
    testUtcNow(createSUT, () => parseTimeToUtc("2026-01-01T00:00:00.000Z"));
    testTimestampNow(createSUT);

    describe("parser", () => {
      testParser(
        plugin.supportsLocalTime,
        () => createSUT().parser,
        parseTimeToUtc,
        parseTimeToLocal,
      );
    });

    describe("advance", () => {
      test("returns itself", () => {
        const sut = createSUT();
        const instance = sut.advance({});
        expect(instance).toBe(sut);
      });

      test("moves up years", () => {
        const sut = createSUT();
        sut.advance({ years: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2027-01-01T00:00:00.000Z"));
      });

      test("moves down years", () => {
        const sut = createSUT();
        sut.advance({ years: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-01-01T00:00:00.000Z"));
      });

      test("moves up months", () => {
        const sut = createSUT();
        sut.advance({ months: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-02-01T00:00:00.000Z"));
      });

      test("moves down months", () => {
        const sut = createSUT();
        sut.advance({ months: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-01T00:00:00.000Z"));
      });

      test("moves up days", () => {
        const sut = createSUT();
        sut.advance({ days: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-02T00:00:00.000Z"));
      });

      test("moves down days", () => {
        const sut = createSUT();
        sut.advance({ days: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T00:00:00.000Z"));
      });

      test("moves up hours", () => {
        const sut = createSUT();
        sut.advance({ hours: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T01:00:00.000Z"));
      });

      test("moves down hours", () => {
        const sut = createSUT();
        sut.advance({ hours: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T23:00:00.000Z"));
      });

      test("moves up minutes", () => {
        const sut = createSUT();
        sut.advance({ minutes: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:01:00.000Z"));
      });

      test("moves down minutes", () => {
        const sut = createSUT();
        sut.advance({ minutes: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T23:59:00.000Z"));
      });

      test("moves up seconds", () => {
        const sut = createSUT();
        sut.advance({ seconds: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:01.000Z"));
      });

      test("moves down seconds", () => {
        const sut = createSUT();
        sut.advance({ seconds: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T23:59:59.000Z"));
      });

      test("moves up milliseconds", () => {
        const sut = createSUT();
        sut.advance({ milliseconds: 1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-01T00:00:00.001Z"));
      });

      test("moves down milliseconds", () => {
        const sut = createSUT();
        sut.advance({ milliseconds: -1 });
        expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-12-31T23:59:59.999Z"));
      });

      describe("issue#56", () => {
        describe("atomicity (mixed-sign multi-field advance)", () => {
          test.each([
            ["days -> hours", { days: 1, hours: -48 }],
            ["hours -> milliseconds", { hours: 1, milliseconds: -7_200_000 }],
            ["milliseconds -> minutes", { milliseconds: 1, minutes: -1 }],
            ["minutes -> months", { minutes: 1, months: -1 }],
            ["months -> seconds", { months: 1, seconds: -3_000_000 }],
            ["seconds -> years", { seconds: 1, years: -1 }],
          ] as const)(
            "does not fire a timeout that isn't due given the final advanced time (%s)",
            (_label, advanceConfiguration) => {
              const sut = createSUT(); // 2026-01-01T00:00:00.000Z
              let callbackCount = 0;
              sut.timers.once(toDuration({ milliseconds: 1 }), () => {
                ++callbackCount;
              });
              sut.advance(advanceConfiguration);
              expect(callbackCount).toBe(0);
            },
          );
          test.each([
            ["days -> hours", { days: 1, hours: -48 }],
            ["hours -> milliseconds", { hours: 1, milliseconds: -7_200_000 }],
            ["milliseconds -> minutes", { milliseconds: 1, minutes: -1 }],
            ["minutes -> months", { minutes: 1, months: -1 }],
            ["months -> seconds", { months: 1, seconds: -3_000_000 }],
            ["seconds -> years", { seconds: 1, years: -1 }],
          ] as const)(
            "does not fire an interval that isn't due given the final advanced time (%s)",
            (_label, advanceConfiguration) => {
              const sut = createSUT(); // 2026-01-01T00:00:00.000Z
              let callbackCount = 0;
              sut.timers.every(toDuration({ milliseconds: 1 }), () => {
                ++callbackCount;
              });
              sut.advance(advanceConfiguration);
              expect(callbackCount).toBe(0);
            },
          );
        });
      });
      describe("issue#122", () => {
        test("advancing by a month from Jan 31 lands on Feb 28 in a non-leap year", () => {
          const sut = createManualRuntime("Pacific/Kiritimati", "2026-01-31T00:00:00.000Z");
          sut.advance({ months: 1 });
          expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-02-28T00:00:00.000Z"));
        });

        test("going back by a month from Feb 28 still lands on Jan 28", () => {
          const sut = createManualRuntime("Pacific/Kiritimati", "2026-02-28T00:00:00.000Z");
          sut.advance({ months: -1 });
          expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2026-01-28T00:00:00.000Z"));
        });

        test("advancing by a year from Feb 29 in a leap year lands on Feb 28 the next year", () => {
          const sut = createManualRuntime("Pacific/Kiritimati", "2024-02-29T00:00:00.000Z");
          sut.advance({ years: 1 });
          expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2025-02-28T00:00:00.000Z"));
        });

        test("going back by a year from Feb 28 in a non leap year still lands on Feb 28 the previous leap year", () => {
          const sut = createManualRuntime("Pacific/Kiritimati", "2025-02-28T00:00:00.000Z");
          sut.advance({ years: -1 });
          expect(sut.clock.utcNow()).toEqual(parseTimeToUtc("2024-02-28T00:00:00.000Z"));
        });
      });

      describe("issue#147", () => {
        describe("self-rescheduling timeout chains", () => {
          test("fires once per delay across a single large advance(), not once total", () => {
            const sut = createSUT(); // 2026-01-01T00:00:00.000Z
            let fireCount = 0;
            const delay = 100;
            function tick() {
              ++fireCount;
              sut.timers.once(toDuration({ milliseconds: delay }), tick);
            }
            sut.timers.once(toDuration({ milliseconds: delay }), tick);

            sut.advance({ seconds: 1 }); // 1000ms at 100ms/tick

            expect(fireCount).toBe(10);
          });

          test("gives the same total fire count whether advanced in one jump or several smaller ones", () => {
            const sut = createSUT(); // 2026-01-01T00:00:00.000Z
            let fireCount = 0;
            const delay = 100;
            function tick() {
              ++fireCount;
              sut.timers.once(toDuration({ milliseconds: delay }), tick);
            }
            sut.timers.once(toDuration({ milliseconds: delay }), tick);

            for (let i = 0; i < 5; i++) {
              sut.advance({ milliseconds: 200 });
            }

            expect(fireCount).toBe(10);
          });
        });
      });
    });

    describe("timers", () => {
      testTimers(() => createSUT().timers);
      describe("additionnal", () => {
        describe("setTimeout", () => {
          test("can be called without specified delay", () => {
            const sut = createSUT();
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.once(asap(), callback);
            sut.clock.utcNow();
            expect(callbackCalled).toBe(true);
          });
          test.each([1, 20, 100])(
            "executes next callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.once(toDuration({ milliseconds: futureDelay }), callbackA);
              sut.once(toDuration({ milliseconds: futureDelay }), callbackB);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.once(toDuration({ milliseconds: futureDelay * 2 }), callbackA);
              sut.once(toDuration({ milliseconds: futureDelay * 2 }), callbackB);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.once(toDuration({ milliseconds: futureDelay }), callbackA);
              const timeoutHandleB = sut.once(toDuration({ milliseconds: futureDelay }), callbackB);
              timeoutHandleA.dispose();
              timeoutHandleB.dispose();
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          describe("issue#105", () => {
            test("does not invoke callback B if callback A cancels it during the same time advance", () => {
              const sut = createSUT();
              let callbackBCalled = false;
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleB = sut.once(toDuration({ milliseconds: 20 }), callbackB);
              const callbackA = () => timeoutHandleB.dispose();
              sut.once(toDuration({ milliseconds: 10 }), callbackA);
              sut.advance({ milliseconds: 30 });
              expect(callbackBCalled).toBe(false);
            });
          });
        });
        describe("every", () => {
          test("can be called without specified delay", () => {
            const sut = createSUT();
            let callbackCalled = false;
            const callback = () => (callbackCalled = true);
            sut.every(asap(), callback);
            sut.clock.utcNow();
            expect(callbackCalled).toBe(true);
          });
          test.each([1, 20, 100])(
            "executes next callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every(toDuration({ milliseconds: futureDelay }), callbackA);
              sut.every(toDuration({ milliseconds: futureDelay }), callbackB);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every(toDuration({ milliseconds: futureDelay * 2 }), callbackA);
              sut.every(toDuration({ milliseconds: futureDelay * 2 }), callbackB);
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              const timeoutHandleA = sut.every(
                toDuration({ milliseconds: futureDelay }),
                callbackA,
              );
              const timeoutHandleB = sut.every(
                toDuration({ milliseconds: futureDelay }),
                callbackB,
              );
              timeoutHandleA.dispose();
              timeoutHandleB.dispose();
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([2, 20, 100])(
            "run next interval callbacks if delay has elapsed",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every(toDuration({ milliseconds: futureDelay }), callbackA);
              sut.every(toDuration({ milliseconds: futureDelay }), callbackB);
              sut.advance({ milliseconds: futureDelay });
              callbackACalled = false;
              callbackBCalled = false;
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([2, 20, 100])(
            "ignore next interval callbacks if delay has not elapsed",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const callbackA = () => (callbackACalled = true);
              const callbackB = () => (callbackBCalled = true);
              sut.every(toDuration({ milliseconds: futureDelay }), callbackA);
              sut.every(toDuration({ milliseconds: futureDelay }), callbackB);
              sut.advance({ milliseconds: futureDelay });
              callbackACalled = false;
              callbackBCalled = false;
              sut.advance({ milliseconds: futureDelay / 2 });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([3, 30, 300])(
            "runs callbacks multiple times if time advance consequently",
            (expectedRetries: number) => {
              const sut = createManualRuntime("Pacific/Kiritimati", 0);
              let retries = 0;
              sut.timers.every(toDuration({ milliseconds: 1000 }), () => {
                retries++;
              });
              sut.advance({
                seconds: expectedRetries,
              });
              expect(retries).toBe(expectedRetries);
            },
          );
          describe("issue#104", () => {
            test("scatter callbacks run in a timely fashion instead of running them multiple time individually", () => {
              const sut = createManualRuntime("Pacific/Kiritimati", 0);
              let buffer: string = "";
              sut.timers.every(toDuration({ milliseconds: 10 }), () => {
                buffer += "A";
              });
              sut.timers.every(toDuration({ milliseconds: 15 }), () => {
                buffer += "B";
              });
              sut.advance({
                milliseconds: 15 * 5,
              });
              expect(buffer).toBe("ABABAABABAAB");
            });
          });
          describe("issue#105", () => {
            test("does not invoke interval B if interval A cancels it during the same time advance", () => {
              const sut = createSUT();
              let callbackBCallCount = 0;
              const callbackB = () => callbackBCallCount++;
              const intervalHandleB = sut.every(toDuration({ milliseconds: 20 }), callbackB);
              const callbackA = () => intervalHandleB.dispose();
              sut.every(toDuration({ milliseconds: 10 }), callbackA);
              sut.advance({ milliseconds: 30 });
              expect(callbackBCallCount).toBe(0);
            });
          });
          test("does not corrupt heap ordering when a zero-delay interval is registered while another is pending", () => {
            const sut = createSUT();
            const order: string[] = [];
            sut.every(toDuration({ milliseconds: 3 }), () => order.push("A"));
            sut.every(asap(), () => order.push("B"));
            sut.advance({ milliseconds: 5 });
            expect(order.join(",")).toBe("B,B,B,A,B,B,B");
          });
          test("does not double-fire when the callback reentrantly advances time itself", () => {
            const sut = createSUT();
            let fireCount = 0;
            let reentered = false;
            sut.every(toDuration({ milliseconds: 100 }), () => {
              fireCount++;
              if (!reentered) {
                reentered = true;
                sut.advance({ milliseconds: 1 });
              }
            });
            sut.advance({ milliseconds: 100 });
            expect(fireCount).toBe(1);
          });
          test("keeps correct tie-break order across a reentrant time advance from within a callback", () => {
            const sut = createSUT();
            const order: string[] = [];
            let reentered = false;
            sut.every(toDuration({ milliseconds: 10 }), () => {
              order.push("A");
              if (!reentered) {
                reentered = true;
                sut.advance({ milliseconds: 1 });
              }
            });
            sut.every(toDuration({ milliseconds: 10 }), () => order.push("B"));
            sut.advance({ milliseconds: 41 });
            expect(order.join(",")).toBe("A,B,A,B,A,B,A,B");
          });
        });
        describe("setRecurring", () => {
          test.each([1, 20, 100])(
            "executes next callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              sut.recurring(
                () => {
                  callbackACalled = true;
                  return false;
                },
                toDuration({ milliseconds: futureDelay }),
              );
              sut.recurring(
                () => {
                  callbackBCalled = true;
                  return false;
                },
                toDuration({ milliseconds: futureDelay }),
              );
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(true);
              expect(callbackBCalled).toBe(true);
            },
          );
          test.each([1, 20, 100])(
            "ignore future callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              sut.recurring(
                () => {
                  callbackACalled = true;
                  return false;
                },
                toDuration({ milliseconds: futureDelay * 2 }),
              );
              sut.recurring(
                () => {
                  callbackBCalled = true;
                  return false;
                },
                toDuration({ milliseconds: futureDelay * 2 }),
              );
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test.each([1, 20, 100])(
            "ignore cleared callbacks when time advance",
            (futureDelay: number) => {
              const sut = createSUT();
              let callbackACalled = false,
                callbackBCalled = false;
              const handleA = sut.recurring(
                () => {
                  callbackACalled = true;
                  return false;
                },
                toDuration({ milliseconds: futureDelay }),
              );
              const handleB = sut.recurring(
                () => {
                  callbackBCalled = true;
                  return false;
                },
                toDuration({ milliseconds: futureDelay }),
              );
              handleA.dispose();
              handleB.dispose();
              sut.advance({ milliseconds: futureDelay });
              expect(callbackACalled).toBe(false);
              expect(callbackBCalled).toBe(false);
            },
          );
          test("stops once callback returns false, instead of continuing to recur", () => {
            const sut = createManualRuntime("Pacific/Kiritimati", 0);
            let runs = 0;
            sut.timers.recurring(
              () => {
                runs++;
                return runs < 3 ? toDuration({ milliseconds: 10 }) : false;
              },
              toDuration({ milliseconds: 10 }),
            );
            sut.advance({ milliseconds: 1000 });
            expect(runs).toBe(3);
          });
          test("recomputes a fresh delay before every run, replaying every boundary a jump crosses", () => {
            const sut = createManualRuntime("Pacific/Kiritimati", 0);
            const delays = [10, 5, 1]; // due at +10, +15, +16
            let calls = 1; // delays[0] is consumed as the initial delay below
            let runs = 0;
            sut.timers.recurring(
              () => {
                runs++;
                return calls < delays.length
                  ? toDuration({ milliseconds: delays[calls++] })
                  : false;
              },
              toDuration({ milliseconds: delays[0] }),
            );
            sut.advance({ milliseconds: 16 });
            expect(runs).toBe(3);
          });
          describe("issue#131", () => {
            test("does not invoke recurring B if recurring A cancels it during the same time advance", () => {
              const sut = createSUT();
              let callbackBCallCount = 0;
              const recurringHandleB = sut.recurring(
                () => {
                  callbackBCallCount++;
                  return toDuration({ milliseconds: 20 });
                },
                toDuration({ milliseconds: 20 }),
              );
              sut.recurring(
                () => {
                  recurringHandleB.dispose();
                  return false;
                },
                toDuration({ milliseconds: 10 }),
              );
              sut.advance({ milliseconds: 30 });
              expect(callbackBCallCount).toBe(0);
            });
            test("a clearRecurring reentrant to its own callback stops the schedule immediately", () => {
              const sut = createSUT();
              let runs = 0;
              let handle: ITimerHandle;
              handle = sut.recurring(
                () => {
                  runs++;
                  handle.dispose();
                  return toDuration({ milliseconds: 10 });
                },
                toDuration({ milliseconds: 10 }),
              );
              sut.advance({ milliseconds: 100 });
              expect(runs).toBe(1);
            });
            test("reentrantly draining other due work from inside a run does not see its own entry as still due", () => {
              const sut = createSUT();
              let recurringRunCalls = 0;
              let recurringRunCallsSeenByReentrantWork: number | undefined;
              sut.recurring(() => {
                recurringRunCalls++;
                if (recurringRunCalls === 2) {
                  // this run is being processed from inside drainDueCallbacks, with the entry
                  // already pulled out of the heap for it to run - scheduling due-now work here
                  // reentrantly drains the same heap; without that removal, it would still find
                  // this same entry sitting there stale and rerun it
                  sut.once(asap(), () => {
                    recurringRunCallsSeenByReentrantWork = recurringRunCalls;
                  });
                }
                return recurringRunCalls < 3 ? asap() : false;
              }, asap());
              sut.advance({ milliseconds: 2 });
              expect(recurringRunCallsSeenByReentrantWork).toBe(2);
              expect(recurringRunCalls).toBe(3);
            });
          });
        });
        describe("runtime heap", () => {
          const compactionThreshold = 1000;
          test("compaction discards timeout entries once it is triggered", () => {
            const sut = createSUT();
            let fireCount = 0;
            const handles: ITimerHandle[] = [];
            const thresholdBeforeCompaction = compactionThreshold - 1;
            for (let i = 0; i < thresholdBeforeCompaction; i++) {
              handles.push(
                sut.once(toDuration({ milliseconds: compactionThreshold + i }), () => fireCount++),
              );
            }
            //clear the half of registered callbacks
            for (let i = 0; i < handles.length; i += 2) {
              handles[i].dispose();
            }
            // this 1000th registration trips COMPACTION_INTERVAL and runs compact()
            sut.once(toDuration({ milliseconds: compactionThreshold * 2 - 2 }), () => fireCount++);
            sut.advance({ milliseconds: compactionThreshold * 2 - 2 });
            expect(fireCount).toBe(compactionThreshold / 2);
          });
          test("compaction discards interval entries once it is triggered", () => {
            const sut = createSUT();
            let fireCount = 0;
            const handles: ITimerHandle[] = [];
            const thresholdBeforeCompaction = compactionThreshold - 1;
            for (let i = 0; i < thresholdBeforeCompaction; i++) {
              handles.push(
                sut.every(toDuration({ milliseconds: compactionThreshold + i }), () => fireCount++),
              );
            }
            //clear the half of registered callbacks
            for (let i = 0; i < handles.length; i += 2) {
              handles[i].dispose();
            }
            // the following setInterval call triggers compaction
            sut.every(toDuration({ milliseconds: compactionThreshold * 2 - 2 }), () => fireCount++);
            sut.advance({ milliseconds: compactionThreshold * 2 - 2 });
            expect(fireCount).toBe(compactionThreshold / 2);
          });
          test("clearing a non-root, non-last heap entry sifts the replacement up when it belongs higher", () => {
            const sut = createSUT();
            const order: string[] = [];
            sut.once(toDuration({ milliseconds: 1 }), () => order.push("1"));
            sut.once(toDuration({ milliseconds: 5 }), () => order.push("5"));
            sut.once(toDuration({ milliseconds: 2 }), () => order.push("2"));
            const toClear = sut.once(toDuration({ milliseconds: 50 }), () => order.push("50"));
            sut.once(toDuration({ milliseconds: 60 }), () => order.push("60"));
            sut.once(toDuration({ milliseconds: 3 }), () => order.push("3"));
            sut.once(toDuration({ milliseconds: 4 }), () => order.push("4"));
            toClear.dispose();
            sut.advance({ milliseconds: 61 });
            sut.utcNow();
            expect(order).toEqual(["1", "2", "3", "4", "5", "60"]);
          });
        });
      });
    });

    describe("performance", () => {
      testPerformance(createSUT);
    });

    describe("addon-cron", () => {
      testAddonCronManual(() => getDeterministicBuilderFor(plugin));
    });
  });
}
