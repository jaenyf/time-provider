import { type IManualTimeAdapter, type IAdvanceConfiguration } from "@time-provider/core";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { DateTime } from "luxon";

export class ManualTimeAdapter extends FixedTimeAdapter implements IManualTimeAdapter<DateTime> {
  constructor(time: string | number | DateTime<boolean>) {
    super(time);
  }
  advance(advanceConfiguration: IAdvanceConfiguration): IManualTimeAdapter<DateTime> {
    if (advanceConfiguration.days) {
      this.setDeterminedTime(this.utcNow().plus({ days: advanceConfiguration.days }));
    }
    if (advanceConfiguration.hours) {
      this.setDeterminedTime(this.utcNow().plus({ hours: advanceConfiguration.hours }));
    }
    if (advanceConfiguration.milliseconds) {
      this.setDeterminedTime(
        this.utcNow().plus({ milliseconds: advanceConfiguration.milliseconds }),
      );
    }
    if (advanceConfiguration.minutes) {
      this.setDeterminedTime(this.utcNow().plus({ minutes: advanceConfiguration.minutes }));
    }
    if (advanceConfiguration.months) {
      this.setDeterminedTime(this.utcNow().plus({ months: advanceConfiguration.months }));
    }
    if (advanceConfiguration.seconds) {
      this.setDeterminedTime(this.utcNow().plus({ seconds: advanceConfiguration.seconds }));
    }
    if (advanceConfiguration.years) {
      this.setDeterminedTime(this.utcNow().plus({ years: advanceConfiguration.years }));
    }
    return this;
  }
}
