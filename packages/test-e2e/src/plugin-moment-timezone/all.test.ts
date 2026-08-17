import { describe } from "vite-plus/test";
import { plugin as systemPlugin } from "../../../plugin-moment-timezone/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-moment-timezone/dist/deterministic.mjs";
import { E2eHelper } from "../e2e-helper.ts";
import moment from "moment-timezone";

describe("e2e moment-timezone", () => {
  E2eHelper.e2eTests(
    systemPlugin,
    deterministicPlugin,
    () => moment.utc().toISOString(),
    (time) => time.toISOString(),
    (time) => time.milliseconds(),
  );
});
