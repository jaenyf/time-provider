import { describe, expect, test } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin as systemPlugin } from "@time-provider/plugin-moment";
import { plugin as deterministicPlugin } from "@time-provider/plugin-moment/deterministic";
import moment from "moment";
import { createTimeProvider as createSystemTimeProvider, type IClock } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";

describe("plugin-moment", () => {
  testAll<moment.Moment>(systemPlugin, deterministicPlugin);
  describe("additionnals", () => {
    test("forcing access to deterministic localNow throws", () => {
      const sut = createDeterministicTimeProvider.for(deterministicPlugin).asManual().create();
      expect(() => (sut.clock as unknown as IClock<Date>).localNow()).toThrow(
        "Operation not supported",
      );
    });
    test("forcing access to system localNow throws", () => {
      const sut = createSystemTimeProvider.for(systemPlugin).create();
      expect(() => (sut.clock as unknown as IClock<Date>).localNow()).toThrow(
        "Operation not supported",
      );
    });
  });
});
