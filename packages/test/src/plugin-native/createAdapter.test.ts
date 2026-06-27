import { describe } from "vite-plus/test";
import { testTimeAdapter, testFixedTimeAdapter } from "@time-provider/test-shared";
import { createTimeAdapter, createFixedTimeAdapter } from "@time-provider/plugin-native";

describe("e2e", () => {
  describe("plugin-native", () => {
    testTimeAdapter(
      () => createTimeAdapter(),
      (initialValue?: number | string | Date) =>
        initialValue ? new Date(initialValue) : new Date(),
    );
    testFixedTimeAdapter(
      () => createFixedTimeAdapter(new Date("2026-01-01")),
      (initialValue?: number | string | Date) =>
        initialValue ? new Date(initialValue) : new Date(),
    );
  });
});
