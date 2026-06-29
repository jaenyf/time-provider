import { BaseFixedTimeAdapter } from "@time-provider/core";
import { TimeAdapter } from "./TimeAdapter.ts";
import type { Temporal } from "@js-temporal/polyfill";

export class FixedTimeAdapter extends BaseFixedTimeAdapter<Temporal.Instant> {
  createFixedTime(fixedDate: string | number | Temporal.Instant): Temporal.Instant {
    return new TimeAdapter().parse(fixedDate);
  }
}
