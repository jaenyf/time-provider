import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-dayjs";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

describe("plugin-dayjs", () => {
  testAll<Dayjs>(plugin);
});
