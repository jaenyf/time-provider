import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin as systemPlugin } from "@time-provider/plugin-moment-timezone";
import { plugin as deterministicPlugin } from "@time-provider/plugin-moment-timezone/deterministic";
import moment from "moment-timezone";

describe("plugin-moment-timezone", () => {
  testAll<moment.Moment>(systemPlugin, deterministicPlugin);
});
