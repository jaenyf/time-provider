import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-dayjs";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { DeterministicScheduler } from "@time-provider/core";
dayjs.extend(utc);

testAll<Dayjs>("plugin-dayjs", plugin, new DeterministicScheduler());
