import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-moment-timezone";
import moment from "moment-timezone";

describe("plugin-moment-timezone", () => {
  testAll<moment.Moment>(plugin);
});
