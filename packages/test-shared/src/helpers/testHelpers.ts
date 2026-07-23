import { expect, test, describe } from "vite-plus/test";
import {
  createTimeProvider,
  type IClock,
  type IParser,
  type IPlugin,
  type IScheduler,
  type ITimeProvider,
  type IUtcOnlyPlugin,
  type PluggedTimeProviderCreator,
  type SetIntervalHandle,
  type SetTimeoutHandle,
  type TimezoneDefinition,
} from "@time-provider/core";

/**
 * Helps getting a wide builder by casting over a discriminant.
 * `createTimeProvider.for()`'s overloads collapse to the narrower IUtcOnlyPlugin one which is wrong.
 */
export function getBuilderFor<TDate>(
  plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>,
): PluggedTimeProviderCreator<TDate> {
  return (
    plugin.supportsLocalTime ? createTimeProvider.for(plugin) : createTimeProvider.for(plugin)
  ) as PluggedTimeProviderCreator<TDate>;
}

export function testCreatedValue<T>(getSut: () => T) {
  test.each([null, undefined])("returns a value", (undefinedValue) => {
    expect(getSut()).not.toBe(undefinedValue);
  });
  test("creates an object", () => {
    expect(typeof getSut()).toBe("object");
  });
}

export function testBuilder<TDate>(
  supportsLocalTime: boolean,
  getSut: () => PluggedTimeProviderCreator<TDate>,
) {
  describe.skipIf(!supportsLocalTime)("withTimezone", () => {
    test.each(["Pacific/Kiritimati", "Asia/Tokyo", "Europe/London"])(
      "withTimezone defines the runtime local timezone",
      (timezone) => {
        let sut = getSut().withTimezone(timezone).create();
        expect(sut.clock.timezone).toEqual(timezone);
      },
    );
    test.each(["Pacific/Kiritimati", "Asia/Tokyo", "Europe/London"])(
      "withHostTimezone defines the runtime local timezone",
      () => {
        let sut = getSut().withHostTimezone().create();
        expect(sut.clock.timezone).toEqual(sut.clock.hostTimezone());
      },
    );
    test.each(["Pacific/Kiritimati", "Asia/Tokyo", "Europe/London"])(
      "withDefaultTimezone defines the runtime local timezone",
      () => {
        let sut = getSut().withDefaultTimezone().create();
        expect(sut.clock.timezone).toEqual("Etc/UTC");
      },
    );
  });
  describe("immutability", () => {
    describe("reassigning", () => {
      describe("clock", () => {
        test("reassigning clock throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            //@ts-ignore any error
            timeProvider.clock = {} as IClock<TDate>;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning timezone throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            //@ts-ignore any error
            timeProvider.clock.timezone = undefined as unknown as TimezoneDefinition;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning utcNow throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.clock.utcNow = () => undefined as unknown as TDate;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning localNow throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.clock.localNow = () => undefined as unknown as TDate;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning hostTimezone throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.clock.hostTimezone = () => undefined as unknown as string;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning withTimezone throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.clock.withTimezone = () => undefined as unknown as IClock<TDate>;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
      });
      describe("parser", () => {
        test("reassigning parser throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            //@ts-ignore any error
            timeProvider.parser = {} as IParser<TDate>;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning parseToLocal throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.parser.parseToLocal = () => undefined as unknown as TDate;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning parseToUtc throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.parser.parseToUtc = () => undefined as unknown as TDate;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
      });
      describe("scheduler", () => {
        test("reassigning scheduler throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            //@ts-ignore any error
            timeProvider.scheduler = {} as IScheduler;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning clearInterval throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.scheduler.clearInterval = () => {};
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning clearTimeout throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.scheduler.clearTimeout = () => {};
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning setInterval throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.scheduler.setInterval = () => undefined as unknown as SetIntervalHandle;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
        test("reassigning setTimeout throws", () => {
          const sut = getSut().create();
          function reassignation(timeProvider: ITimeProvider<TDate>) {
            timeProvider.scheduler.setTimeout = () => undefined as unknown as SetTimeoutHandle;
          }
          expect(() => {
            reassignation(sut);
          }).toThrow();
        });
      });
    });
  });
}

export function testDefaultEpochTime<TDate>(
  getSut: () => { clock: { utcNow(): TDate }; parser: { parseToUtc(value: number): TDate } },
) {
  test("uses default epoch time", () => {
    const sut = getSut();
    expect(sut.clock.utcNow()).toEqual(sut.parser.parseToUtc(0));
  });
}

export function testConstructorArgs<TDate>(
  describeName: string,
  createSUT: () => unknown,
  constructWith?: (initialValue: string | number | TDate) => void,
  parseTimeToUtc?: (initialValue: string | number | TDate) => TDate,
) {
  describe(describeName, () => {
    testCreatedValue(createSUT);
    if (constructWith && parseTimeToUtc) {
      test.each(["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"])(
        "can construct an object with a string",
        (isoTimeText: string) => constructWith(isoTimeText),
      );
      test.each([0, 100])("can construct an object with a number", (milliseconds: number) =>
        constructWith(milliseconds),
      );
      test("can construct an object with a TDate", () =>
        constructWith(parseTimeToUtc("2026-01-01T00:00:00.000Z")));
    }
  });
}

export function testWithTimezone<TDate>(
  supportsLocalTime: boolean,
  getSut: () => { clock: unknown },
) {
  describe.skipIf(!supportsLocalTime)("hostTimezone", () => {
    test("doesn't throw", () => {
      const clock = getSut().clock as unknown as IClock<TDate>;
      expect(() => clock.hostTimezone()).not.toThrow();
    });
    test("returns system timezone", () => {
      const clock = getSut().clock as unknown as IClock<TDate>;
      const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      expect(clock.hostTimezone()).toEqual(systemTimezone);
    });
  });
  describe.skipIf(!supportsLocalTime)("withTimezone", () => {
    test.each(["", "Etc/UTC", "Pacific/Kiritimati", "invalid timezone"])(
      "doesn't throw",
      (newLocalTimezone) => {
        const clock = getSut().clock as unknown as IClock<TDate>;
        expect(() => clock.withTimezone(newLocalTimezone)).not.toThrow();
      },
    );
    test.each([undefined, null])("returns its instance", () => {
      const clock = getSut().clock as unknown as IClock<TDate>;
      expect(clock.withTimezone("Pacific/Kiritimati")).toBe(clock);
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
      const clock = getSut().clock as unknown as IClock<TDate>;
      const previousLocalTime = clock.localNow();
      clock.withTimezone(newLocalTimezone);
      const newLocalTime = clock.localNow();
      expect(newLocalTime).not.toEqual(previousLocalTime);
    });
  });
}

export function testLocalNow<TDate>(
  supportsLocalTime: boolean,
  getSut: () => { clock: unknown },
  getExpectedFixedValue?: () => TDate,
) {
  describe.skipIf(!supportsLocalTime)("localNow", () => {
    test("doesn't throw", () => {
      const clock = getSut().clock as unknown as IClock<TDate>;
      expect(() => clock.localNow()).not.toThrow();
    });
    test("throw with invalid timezone", () => {
      const clock = getSut().clock as unknown as IClock<TDate>;
      clock.withTimezone("invalid");
      expect(() => clock.localNow()).toThrow();
    });
    test.each([undefined, null])("returns a value", (undefinedValue) => {
      const clock = getSut().clock as unknown as IClock<TDate>;
      expect(clock.localNow()).not.toEqual(undefinedValue);
    });
    if (getExpectedFixedValue) {
      test("returns a fixed value", () => {
        const clock = getSut().clock as unknown as IClock<TDate>;
        expect(clock.localNow()).toEqual(getExpectedFixedValue());
      });
    }
  });
}

export function testUtcNow<TDate>(
  getSut: () => { clock: { utcNow(): TDate } },
  getExpectedFixedValue?: () => TDate,
) {
  describe("utcNow", () => {
    test("doesn't throw", () => {
      expect(() => getSut().clock.utcNow()).not.toThrow();
    });
    test.each([undefined, null])("returns a value", (undefinedValue) => {
      expect(getSut().clock.utcNow()).not.toEqual(undefinedValue);
    });
    if (getExpectedFixedValue) {
      test("returns a fixed value", () => {
        expect(getSut().clock.utcNow()).toEqual(getExpectedFixedValue());
      });
    }
  });
}
