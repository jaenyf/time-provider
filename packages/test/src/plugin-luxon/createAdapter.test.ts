import { describe } from "vite-plus/test";
import { testTimeAdapter } from "@time-provider/test-shared";
import { createTimeAdapter } from "@time-provider/plugin-luxon";
import { DateTime } from "luxon";

describe("e2e", () => {
  describe("plugin-luxon", () => {
    testTimeAdapter(
      () => createTimeAdapter(),
      (initialValue: number | string | DateTime) => createTimeAdapter().parse(initialValue),
    );
  });
});
