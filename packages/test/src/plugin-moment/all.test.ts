import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-moment";
import moment from "moment";
import { DeterministicScheduler } from "@time-provider/core";

testAll<moment.Moment>("plugin-moment", plugin, new DeterministicScheduler());
