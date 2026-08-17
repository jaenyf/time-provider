import { describe } from "vite-plus/test";
import { plugin as systemPlugin } from "../../../plugin-native/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-native/dist/deterministic.mjs";
import { E2eHelper } from "../e2e-helper.ts";

describe("e2e native", () => {
  E2eHelper.e2eUtcOnlyTests(
    systemPlugin,
    deterministicPlugin,
    () => new Date().toISOString(),
    (time) => time.toISOString(),
    (time) => time.getTime(),
  );
});
