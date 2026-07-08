import { type IManualTimeAdapter, type IAdvanceConfiguration } from "@time-provider/core";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import dayjs, { Dayjs } from "dayjs";

export class ManualTimeAdapter extends FixedTimeAdapter implements IManualTimeAdapter<Dayjs> {
  constructor(time: string | number | dayjs.Dayjs) {
    super(time);
  }
  advance(advanceConfiguration: IAdvanceConfiguration): IManualTimeAdapter<dayjs.Dayjs> {
    if (advanceConfiguration.days) {
      this.setDeterminedTime(this.utcNow().add(advanceConfiguration.days, "day"));
    }
    if (advanceConfiguration.hours) {
      this.setDeterminedTime(this.utcNow().add(advanceConfiguration.hours, "hour"));
    }
    if (advanceConfiguration.milliseconds) {
      this.setDeterminedTime(this.utcNow().add(advanceConfiguration.milliseconds, "millisecond"));
    }
    if (advanceConfiguration.minutes) {
      this.setDeterminedTime(this.utcNow().add(advanceConfiguration.minutes, "minute"));
    }
    if (advanceConfiguration.months) {
      this.setDeterminedTime(this.utcNow().add(advanceConfiguration.months, "month"));
    }
    if (advanceConfiguration.seconds) {
      this.setDeterminedTime(this.utcNow().add(advanceConfiguration.seconds, "second"));
    }
    if (advanceConfiguration.years) {
      this.setDeterminedTime(this.utcNow().add(advanceConfiguration.years, "year"));
    }

    return this;
  }
}
