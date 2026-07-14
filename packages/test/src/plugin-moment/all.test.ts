import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-moment";
import moment from "moment";

describe("plugin-moment", () => {
  testAll<moment.Moment>(plugin);
});
