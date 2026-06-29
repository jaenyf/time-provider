import { BaseFixedTimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { DateTime } from "luxon";

export class FixedTimeAdapter extends BaseFixedTimeAdapter<DateTime> {
  createFixedTime(fixedDate: string | number | DateTime<boolean>): DateTime<boolean> {
    return new TimeAdapter().parse(fixedDate);
  }
}
