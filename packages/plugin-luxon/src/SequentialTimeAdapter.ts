import { BaseSequentialTimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import { DateTime } from "luxon";

export class SequentialTimeAdapter extends BaseSequentialTimeAdapter<DateTime> {
  protected convertToDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
    return new TimeAdapter().parse(time);
  }
}
