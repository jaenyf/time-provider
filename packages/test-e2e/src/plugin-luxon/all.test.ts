import { describe } from "vite-plus/test";
import { plugin as systemPlugin } from "../../../plugin-luxon/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-luxon/dist/deterministic.mjs";
import { E2eHelper } from "../e2e-helper.ts";
import { DateTime } from "luxon";

describe("e2e luxon", () => {
  E2eHelper.e2eTests(
    systemPlugin,
    deterministicPlugin,
    () => DateTime.utc().toString(),
    (time) => time.toString(),
    (time) => time.toMillis(),
  );
});
