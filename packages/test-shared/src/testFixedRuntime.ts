import { expect, test, describe } from "vite-plus/test";
import type { IClock, IPlugin, IUtcOnlyPlugin, TimezoneDefinition } from "@time-provider/core";
import { testScheduler } from "./testScheduler.ts";
import { testParser } from "./testParser.ts";

export function testFixedRuntime<TDate>(
  plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>,
  parseTime: (initialValue: string | number | TDate, expressesAsLocal?: boolean) => TDate,
) {
  const createFixedRuntime = (timezone: TimezoneDefinition, initialTime: string | number | TDate) =>
    plugin.supportsLocalTime
      ? plugin.createFixedRuntime(timezone, initialTime)
      : plugin.createFixedRuntime(initialTime);

  const createSUT = () => createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");

  describe("createFixedRuntime", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(createSUT()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof createSUT()).toBe("object");
    });
    test.each(["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"])(
      "can construct an object with a string",
      (isoTimeText: string) => {
        createFixedRuntime("Pacific/Kiritimati", isoTimeText);
      },
    );
    test.each([0, 100])("can construct an object with a number", (milliseconds: number) => {
      createFixedRuntime("Pacific/Kiritimati", milliseconds);
    });
    test("can construct an object with a TDate", () => {
      createFixedRuntime("Pacific/Kiritimati", parseTime("2026-01-01T00:00:00.000Z"));
    });
  });

  describe("fixed", () => {
    describe.skipIf(!plugin.supportsLocalTime)("localNow", () => {
      test("doesn't throw", () => {
        const sut = createSUT();
        expect(() => (sut.clock as IClock<TDate>).localNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSUT();
        expect((sut.clock as IClock<TDate>).localNow()).not.toEqual(undefinedValue);
      });
      test("returns a fixed value", () => {
        const sut = createSUT();
        expect((sut.clock as IClock<TDate>).localNow()).toEqual(
          parseTime("2026-01-01T14:00+14:00", true),
        );
      });
    });

    describe.skipIf(!plugin.supportsLocalTime)("withLocalTimezone", () => {
      test.each(["", "Etc/UTC", "Pacific/Kiritimati", "invalid timezone"])(
        "doesn't throw",
        (newLocalTimezone: TimezoneDefinition) => {
          const sut = createSUT();
          expect(() =>
            (sut.clock as IClock<TDate>).withLocalTimezone(newLocalTimezone),
          ).not.toThrow();
        },
      );
      test.each([undefined, null])("returns its instance", () => {
        const sut = createSUT();
        const clock = sut.clock as IClock<TDate>;
        expect(clock.withLocalTimezone("Pacific/Kiritimati")).toBe(clock);
      });
      test.each([
        "Etc/UTC",
        "Africa/Cairo",
        "Antarctica/McMurdo",
        "Asia/Tokyo",
        "Europe/London",
        "America/New_York",
        "America/Sao_Paulo", //no DST
        "Australia/Sydney",
      ])("effectively alter the timezone", (newLocalTimezone) => {
        const sut = createSUT();
        const clock = sut.clock as IClock<TDate>;
        const previousLocalTime = clock.localNow();
        clock.withLocalTimezone(newLocalTimezone);
        const newLocalTime = clock.localNow();
        expect(newLocalTime).not.toEqual(previousLocalTime);
      });
    });

    describe("utcNow", () => {
      test("doesn't throw", () => {
        const sut = createSUT();
        expect(() => sut.clock.utcNow()).not.toThrow();
      });
      test.each([undefined, null])("returns a value", (undefinedValue) => {
        const sut = createSUT();
        expect(sut.clock.utcNow()).not.toEqual(undefinedValue);
      });
      test("returns a fixed value", () => {
        const sut = createSUT();
        expect(sut.clock.utcNow()).toEqual(parseTime("2026-01-01T00:00:00.000Z"));
      });
    });

    describe("parser", () => {
      testParser(() => createSUT().parser, parseTime);
    });

    describe("scheduler", () => {
      testScheduler(() => createSUT().scheduler, true);
      describe("issue#57", () => {
        //see: https://github.com/jaenyf/time-provider/issues/57
        test.each([0, -1, -100])("a zero-or-negative-delay timeout should not fire", (delay) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let timeoutCalled = false;
          sut.scheduler.setTimeout(() => {
            timeoutCalled = true;
          }, delay);
          expect(timeoutCalled).toBe(false);
        });
        test.each([0, -1, -100])("a zero-or-negative-delay interval should not fire", (delay) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let intervalCalled = false;
          sut.scheduler.setInterval(() => {
            intervalCalled = true;
          }, delay);
          expect(intervalCalled).toBe(false);
        });
        test.each([1, 2, 100])("a positive-delay timeout should not fire", (delay) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let timeoutCalled = false;
          sut.scheduler.setTimeout(() => {
            timeoutCalled = true;
          }, delay);
          expect(timeoutCalled).toBe(false);
        });
        test.each([1, 2, 100])("a positive-delay interval should not fire", (delay) => {
          const sut = createFixedRuntime("Pacific/Kiritimati", "2026-01-01T00:00:00.000Z");
          let intervalCalled = false;
          sut.scheduler.setInterval(() => {
            intervalCalled = true;
          }, delay);
          expect(intervalCalled).toBe(false);
        });
      });
    });
  });
}
