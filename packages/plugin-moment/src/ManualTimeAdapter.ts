import { type IManualTimeAdapter, type IAdvanceConfiguration } from "@time-provider/core";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { type Moment } from "moment";
import moment from "moment";

export class ManualTimeAdapter extends FixedTimeAdapter implements IManualTimeAdapter<Moment> {
  constructor(time: string | number | moment.Moment) {
    super(time);
  }
  private ensureDeterminedTime(time: Moment) {
    this.setDeterminedTime(moment(time.toISOString()));
  }
  advance(advanceConfiguration: IAdvanceConfiguration): IManualTimeAdapter<Moment> {
    if (advanceConfiguration.days) {
      this.ensureDeterminedTime(this.utcNow().add({ days: advanceConfiguration.days }));
    }
    if (advanceConfiguration.hours) {
      this.ensureDeterminedTime(this.utcNow().add({ hour: advanceConfiguration.hours }));
    }
    if (advanceConfiguration.milliseconds) {
      this.ensureDeterminedTime(
        this.utcNow().add(advanceConfiguration.milliseconds, "milliseconds"),
      );
    }
    if (advanceConfiguration.minutes) {
      this.ensureDeterminedTime(this.utcNow().add(advanceConfiguration.minutes, "minutes"));
    }
    if (advanceConfiguration.months) {
      this.ensureDeterminedTime(this.utcNow().add(advanceConfiguration.months, "months"));
    }
    if (advanceConfiguration.seconds) {
      this.ensureDeterminedTime(this.utcNow().add(advanceConfiguration.seconds, "seconds"));
    }
    if (advanceConfiguration.years) {
      this.ensureDeterminedTime(this.utcNow().add(advanceConfiguration.years, "years"));
    }
    return this;
  }
}
