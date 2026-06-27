import { describe } from "vite-plus/test";
import { testTimeProvider, testFixedTimeProvider } from "@time-provider/test-shared";
import { createTimeProvider, createFixedTimeProvider } from "@time-provider/time";
import { createTimeAdapter, createFixedTimeAdapter } from "@time-provider/plugin-moment";
import moment from "moment";

describe("e2e", () => {
  describe("plugin-native", () => {
    testTimeProvider(() => createTimeProvider(createTimeAdapter()));
    testFixedTimeProvider(() =>
      createFixedTimeProvider(createFixedTimeAdapter(moment("2026-01-01"))),
    );
  });
});
