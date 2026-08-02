import { describe, expect, test } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { createTimeProvider } from "@time-provider/core";
import { plugin as systemPlugin } from "@time-provider/plugin-luxon";
import { plugin as deterministicPlugin } from "@time-provider/plugin-luxon/deterministic";
import { DateTime } from "luxon";

describe("plugin-luxon", () => {
  testAll<DateTime>(systemPlugin, deterministicPlugin);
  describe("additionals", () => {
    describe("parseToLocal", () => {
      test.each([null, undefined, {}, true, false])(
        "throws when forcing illegal objects",
        (illegal) => {
          const sut = createTimeProvider.for(systemPlugin).create();
          expect(() => {
            sut.parser.parseToLocal(illegal as string | number | DateTime<boolean>);
          }).toThrow(`Invalid time value (value was '${illegal as string}')`);
        },
      );
    });
    describe("parseToUtc", () => {
      test.each([null, undefined, {}, true, false])(
        "throws when forcing illegal objects",
        (illegal) => {
          const sut = createTimeProvider.for(systemPlugin).create();
          expect(() => {
            sut.parser.parseToUtc(illegal as string | number | DateTime<boolean>);
          }).toThrow(`Invalid time value (value was '${illegal as string}')`);
        },
      );
    });
    describe("parseToLocal", () => {
      describe("issue#127", () => {
        test("throws timezone-related error when the timezone is invalid", () => {
          const sut = createTimeProvider.for(systemPlugin).create();
          sut.clock.withTimezone("Not/A_Real_Zone");
          expect(() => {
            sut.parser.parseToLocal("2026-01-01T00:00:00.000Z");
          }).toThrow("Invalid timezone value (value was 'Not/A_Real_Zone')");
        });
      });
    });
  });
});
