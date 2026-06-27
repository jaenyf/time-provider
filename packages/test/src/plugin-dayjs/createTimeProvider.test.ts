import { describe } from "vite-plus/test";
import { testTimeProvider, testFixedTimeProvider } from "@time-provider/test-shared";
import { createTimeProvider, createFixedTimeProvider } from "@time-provider/time";
import { createTimeAdapter, createFixedTimeAdapter } from "@time-provider/plugin-dayjs";
import dayjs from "dayjs";

describe("e2e", () => {
  describe("plugin-native", () => {
    testTimeProvider(() => createTimeProvider(createTimeAdapter()));
    testFixedTimeProvider(() =>
      createFixedTimeProvider(createFixedTimeAdapter(dayjs("2026-01-01"))),
    );
  });
});
