import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-native";
import { DeterministicScheduler } from "@time-provider/core";

testAll<Date>("plugin-native", plugin, new DeterministicScheduler());
