import {
  type IAdvanceConfiguration,
  BaseManualRuntime,
  type IManualRuntime,
} from "@time-provider/core";

import { RuntimeHelper } from "./RuntimeHelper.ts";
import moment from "moment";

export class ManualRuntime extends BaseManualRuntime<moment.Moment> {
  private ensureDeterminedTime(time: moment.Moment) {
    this.setDeterminedTime(moment(time.toISOString()));
  }
  override advanceImpl(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<moment.Moment> {
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
  protected convertToTimestampImpl(time: string | number | moment.Moment): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | moment.Moment): moment.Moment {
    return RuntimeHelper.convertToDate(time);
  }
}
