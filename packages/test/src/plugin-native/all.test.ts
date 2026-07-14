import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-native";

describe("plugin-native", () => {
  testAll<Date>(plugin);
});
