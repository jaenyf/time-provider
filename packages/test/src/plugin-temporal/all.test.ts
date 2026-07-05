import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";

testAll<Temporal.Instant>("plugin-temporal", plugin);
