import { BaseDeterministicTimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { DateTime } from "luxon";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<DateTime> {
  protected convertToDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
    return new TimeAdapter(this.scheduler).parse(time);
  }
}
