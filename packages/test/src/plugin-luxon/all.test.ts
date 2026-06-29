import { testAll } from "@time-provider/test-shared";
import { TimeAdapter, FixedTimeAdapter } from "@time-provider/plugin-luxon";
import { DateTime } from "luxon";

testAll<DateTime>(
  "plugin-luxon",
  (initialValue: number | string | DateTime) => new TimeAdapter().parse(initialValue),
  () => new TimeAdapter(),
  () => new FixedTimeAdapter(DateTime.fromISO("2026-01-01T00:00Z")),
);
