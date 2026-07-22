import { describe, expect, test } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-moment";
import moment from "moment";
import { createTimeProvider, type IClock } from "@time-provider/core";

describe("plugin-moment", () => {
  testAll<moment.Moment>(plugin);
  describe("additionnals", () => {
    test("forcing access to deterministic localNow throws", () => {
      const sut = createTimeProvider.for(plugin).asManual().create();
      expect(() => (sut.clock as unknown as IClock<Date>).localNow()).toThrow(
        "Operation not supported",
      );
    });
    test("forcing access to system localNow throws", () => {
      const sut = createTimeProvider.for(plugin).create();
      expect(() => (sut.clock as unknown as IClock<Date>).localNow()).toThrow(
        "Operation not supported",
      );
    });
  });
});
