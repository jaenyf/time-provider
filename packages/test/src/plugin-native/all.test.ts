import { describe, expect, test } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { createTimeProvider, type IClock } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

describe("plugin-native", () => {
  testAll<Date>(plugin);
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
