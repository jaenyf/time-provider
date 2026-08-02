import { describe, expect, test } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin as systemPlugin } from "@time-provider/plugin-dayjs";
import { plugin as deterministicPlugin } from "@time-provider/plugin-dayjs/deterministic";
import { Dayjs } from "dayjs";
import { createTimeProvider } from "@time-provider/core/";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";

describe("plugin-dayjs", () => {
  testAll<Dayjs>(systemPlugin, deterministicPlugin);
  describe("additionals", () => {
    describe("issue#125", () => {
      describe("parseToLocal", () => {
        test("throws the library's own error instead of leaking dayjs's raw timezone error (system)", () => {
          const sut = createTimeProvider.for(systemPlugin).create();
          sut.clock.withTimezone("Not/A_Real_Zone");
          expect(() => {
            sut.parser.parseToLocal("2026-01-01T00:00:00.000Z");
          }).toThrow("Invalid timezone value (value was 'Not/A_Real_Zone')");
        });
        test("throws the library's own error instead of leaking dayjs's raw timezone error (deterministic)", () => {
          const sut = createDeterministicTimeProvider.for(deterministicPlugin).asManual().create();
          sut.clock.withTimezone("Not/A_Real_Zone");
          expect(() => {
            sut.parser.parseToLocal("2026-01-01T00:00:00.000Z");
          }).toThrow("Invalid timezone value (value was 'Not/A_Real_Zone')");
        });
      });
    });
  });
});
