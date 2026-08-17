import { describe } from "vite-plus/test";
import { plugin as systemPlugin } from "../../../plugin-dayjs/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-dayjs/dist/deterministic.mjs";
import { E2eHelper } from "../e2e-helper.ts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

describe("e2e plugin-dayjs", () => {
  E2eHelper.e2eTests(
    systemPlugin,
    deterministicPlugin,
    () => dayjs.utc().toISOString(),
    (time) => time.toISOString(),
    (time) => time.unix(),
  );
});
