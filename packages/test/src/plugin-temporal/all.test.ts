import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";

describe("plugin-temporal", () => {
  testAll<Temporal.Instant>(plugin);
});
