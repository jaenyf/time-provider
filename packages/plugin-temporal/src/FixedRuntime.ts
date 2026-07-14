import { BaseFixedRuntime } from "@time-provider/core";
import { RuntimeHelper } from "./RuntimeHelper.ts";
import type { Temporal } from "@js-temporal/polyfill";

export class FixedRuntime extends BaseFixedRuntime<Temporal.Instant> {
  protected convertToTimestampImpl(time: string | number | Temporal.Instant): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | Temporal.Instant): Temporal.Instant {
    return RuntimeHelper.convertToDate(time);
  }
}
