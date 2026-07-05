import { BaseDeterministicTimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { DateTime } from "luxon";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<DateTime> {
  protected createDeterminedTime(
    fixedDate: string | number | DateTime<boolean>,
  ): DateTime<boolean> {
    return new TimeAdapter().parse(fixedDate);
  }
}
