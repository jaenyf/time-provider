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
  });
});
