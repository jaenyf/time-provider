import { BaseSequentialTimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import type { Temporal } from "@js-temporal/polyfill";

export class SequentialTimeAdapter extends BaseSequentialTimeAdapter<Temporal.Instant> {
  protected convertToDateImpl(time: string | number | Temporal.Instant): Temporal.Instant {
    return new TimeAdapter(this.scheduler).parse(time);
  }
}
