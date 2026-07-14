import {
  type IAdvanceConfiguration,
  BaseManualRuntime,
  type IManualRuntime,
} from "@time-provider/core";

import { RuntimeHelper } from "./RuntimeHelper.ts";
import type { Temporal } from "@js-temporal/polyfill";

export class ManualRuntime extends BaseManualRuntime<Temporal.Instant> {
  override advanceImpl(
    advanceConfiguration: IAdvanceConfiguration,
  ): IManualRuntime<Temporal.Instant> {
    if (advanceConfiguration.days) {
      this.setDeterminedTime(
        this.utcNow()
          .toZonedDateTimeISO("UTC")
          .add({ days: advanceConfiguration.days })
          .toInstant(),
      );
    }
    if (advanceConfiguration.hours) {
      this.setDeterminedTime(this.utcNow().add({ hours: advanceConfiguration.hours }));
    }
    if (advanceConfiguration.milliseconds) {
      this.setDeterminedTime(
        this.utcNow()
          .toZonedDateTimeISO("UTC")
          .add({
            milliseconds: advanceConfiguration.milliseconds,
          })
          .toInstant(),
      );
    }
    if (advanceConfiguration.minutes) {
      this.setDeterminedTime(
        this.utcNow()
          .toZonedDateTimeISO("UTC")
          .add({
            minutes: advanceConfiguration.minutes,
          })
          .toInstant(),
      );
    }
    if (advanceConfiguration.months) {
      this.setDeterminedTime(
        this.utcNow()
          .toZonedDateTimeISO("UTC")
          .add({ months: advanceConfiguration.months })
          .toInstant(),
      );
    }
    if (advanceConfiguration.seconds) {
      this.setDeterminedTime(
        this.utcNow()
          .toZonedDateTimeISO("UTC")
          .add({
            seconds: advanceConfiguration.seconds,
          })
          .toInstant(),
      );
    }
    if (advanceConfiguration.years) {
      this.setDeterminedTime(
        this.utcNow()
          .toZonedDateTimeISO("UTC")
          .add({ years: advanceConfiguration.years })
          .toInstant(),
      );
    }
    return this;
  }
  protected convertToTimestampImpl(time: string | number | Temporal.Instant): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | Temporal.Instant): Temporal.Instant {
    return RuntimeHelper.convertToDate(time);
  }
}
