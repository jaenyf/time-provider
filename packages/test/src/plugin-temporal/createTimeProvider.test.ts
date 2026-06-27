import { describe } from "vite-plus/test";
import { testTimeProvider, testFixedTimeProvider } from "@time-provider/test-shared";
import { createTimeProvider, createFixedTimeProvider } from "@time-provider/time";
import { createTimeAdapter, createFixedTimeAdapter } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";

describe("e2e", () => {
  describe("plugin-temporal", () => {
    testTimeProvider(() => createTimeProvider(createTimeAdapter()));
    testFixedTimeProvider(() =>
      createFixedTimeProvider(createFixedTimeAdapter(Temporal.Instant.from("2026-01-01T00:00Z"))),
    );
  });
});
