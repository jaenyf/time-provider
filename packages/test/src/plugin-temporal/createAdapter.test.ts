import { describe } from "vite-plus/test";
import { testTimeAdapter } from "@time-provider/test-shared";
import { createTimeAdapter } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";

describe("e2e", () => {
  describe("plugin-temporal", () => {
    testTimeAdapter(
      () => createTimeAdapter(),
      (initialValue?: number | string | Temporal.Instant) =>
        initialValue
          ? typeof initialValue === "number"
            ? Temporal.Instant.fromEpochMilliseconds(initialValue)
            : Temporal.Instant.from(initialValue)
          : Temporal.Now.instant(),
    );
  });
});
