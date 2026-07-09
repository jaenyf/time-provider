import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";
import { DeterministicScheduler } from "@time-provider/core";

testAll<Temporal.Instant>("plugin-temporal", plugin, new DeterministicScheduler());
