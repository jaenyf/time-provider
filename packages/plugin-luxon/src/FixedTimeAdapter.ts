import { BaseDeterministicTimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { DateTime } from "luxon";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<DateTime> {
  constructor(time: string | number | DateTime<boolean>) {
    super(time);
  }
  protected convertToDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
    return new TimeAdapter().parse(time);
  }
}
