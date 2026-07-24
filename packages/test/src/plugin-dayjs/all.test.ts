import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin as systemPlugin } from "@time-provider/plugin-dayjs";
import { plugin as deterministicPlugin } from "@time-provider/plugin-dayjs/deterministic";
import { Dayjs } from "dayjs";

describe("plugin-dayjs", () => {
  testAll<Dayjs>(systemPlugin, deterministicPlugin);
});
