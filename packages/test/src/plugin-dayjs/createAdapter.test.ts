import { describe } from "vite-plus/test";
import { testTimeAdapter, testFixedTimeAdapter } from "@time-provider/test-shared";
import { createTimeAdapter, createFixedTimeAdapter } from "@time-provider/plugin-dayjs";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

describe("e2e", () => {
  describe("plugin-dayjs", () => {
    testTimeAdapter(
      () => createTimeAdapter(),
      (initialValue?: number | string | Dayjs) => (initialValue ? dayjs(initialValue) : dayjs()),
    );
    testFixedTimeAdapter(
      () => createFixedTimeAdapter(dayjs("2026-01-01")),
      (_initialValue?: number | string | Dayjs) => dayjs("2026-01-01"),
    );
  });
});
