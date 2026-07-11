import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-native";

testAll<Date>("plugin-native", plugin);
