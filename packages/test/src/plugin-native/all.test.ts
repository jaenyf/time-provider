import { testAll } from "@time-provider/test-shared";
import { TimeAdapter, FixedTimeAdapter } from "@time-provider/plugin-native";

testAll<Date>(
  "plugin-native",
  (initialValue: number | string | Date) => new TimeAdapter().parse(initialValue),
  () => new TimeAdapter(),
  () => new FixedTimeAdapter(new Date("2026-01-01T00:00Z")),
);
