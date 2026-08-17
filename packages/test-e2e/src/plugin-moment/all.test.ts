import { describe } from "vite-plus/test";
import { plugin as systemPlugin } from "../../../plugin-moment/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-moment/dist/deterministic.mjs";
import { E2eHelper } from "../e2e-helper.ts";
import moment from "moment";

describe("e2e moment", () => {
  E2eHelper.e2eUtcOnlyTests(
    systemPlugin,
    deterministicPlugin,
    () => moment.utc().toISOString(),
    (time) => time.toISOString(),
    (time) => time.milliseconds(),
  );
});
