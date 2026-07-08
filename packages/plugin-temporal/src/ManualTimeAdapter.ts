import { type IManualTimeAdapter, type IAdvanceConfiguration } from "@time-provider/core";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import type { Temporal } from "@js-temporal/polyfill";

export class ManualTimeAdapter
  extends FixedTimeAdapter
  implements IManualTimeAdapter<Temporal.Instant>
{
  constructor(time: string | number | Temporal.Instant) {
    super(time);
  }
  advance(advanceConfiguration: IAdvanceConfiguration): IManualTimeAdapter<Temporal.Instant> {
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
}
