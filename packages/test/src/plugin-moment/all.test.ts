import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-moment";
import moment from "moment";

testAll<moment.Moment>("plugin-moment", plugin);
