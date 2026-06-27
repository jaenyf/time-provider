import { describe } from "vite-plus/test";
import { testTimeAdapter } from "@time-provider/test-shared";
import { createTimeAdapter } from "@time-provider/plugin-moment";
import moment from "moment";

describe("e2e", () => {
  describe("plugin-moment", () => {
    testTimeAdapter(
      () => createTimeAdapter(),
      (initialValue?: number | string | moment.Moment) =>
        initialValue ? moment(initialValue) : moment(),
    );
  });
});
