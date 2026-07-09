import { describe, expect, test } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { createTimeProvider, DeterministicScheduler } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-luxon";
import { DateTime } from "luxon";

testAll<DateTime>("plugin-luxon", plugin, new DeterministicScheduler());

describe("plugin-luxon", () => {
  describe("additionals", () => {
    describe("parse", () => {
      test.each([null, undefined, {}, true, false])(
        "throws when forcing illegal objects",
        (illegal) => {
          const sut = createTimeProvider.for(plugin).create();
          expect(() => {
            sut.parse(illegal as string | number | DateTime<boolean>);
          }).toThrow(`Undefined time type (value was '${illegal as string}')`);
        },
      );
    });
  });
});
