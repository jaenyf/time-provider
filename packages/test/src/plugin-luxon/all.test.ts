import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-luxon";
import { DateTime } from "luxon";

testAll<DateTime>("plugin-luxon", plugin);
