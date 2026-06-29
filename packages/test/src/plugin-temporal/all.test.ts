import { testAll } from "@time-provider/test-shared";
import { TimeAdapter, FixedTimeAdapter } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";

testAll<Temporal.Instant>(
  "plugin-temporal",
  (initialValue?: number | string | Temporal.Instant) =>
    initialValue
      ? typeof initialValue === "number"
        ? Temporal.Instant.fromEpochMilliseconds(initialValue)
        : Temporal.Instant.from(initialValue)
      : Temporal.Now.instant(),
  () => new TimeAdapter(),
  () => new FixedTimeAdapter(Temporal.Instant.from("2026-01-01T00:00Z")),
);
