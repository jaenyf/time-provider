import { testAll } from "@time-provider/test-shared";
import { TimeAdapter, FixedTimeAdapter } from "@time-provider/plugin-moment";
import moment from "moment";

testAll<moment.Moment>(
  "plugin-moment",
  (initialValue: number | string | moment.Moment) => new TimeAdapter().parse(initialValue),
  () => new TimeAdapter(),
  () => new FixedTimeAdapter(moment("2026-01-01T00:00Z")),
);
