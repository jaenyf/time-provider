import { testAll } from "@time-provider/test-shared";
import { TimeAdapter, FixedTimeAdapter } from "@time-provider/plugin-dayjs";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

testAll<Dayjs>(
  "plugin-dayjs",
  (initialValue?: number | string | Dayjs) => (initialValue ? dayjs(initialValue) : dayjs()),
  () => new TimeAdapter(),
  () => new FixedTimeAdapter(dayjs("2026-01-01T00:00Z")),
);
