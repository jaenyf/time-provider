import {
  type IAdvanceConfiguration,
  BaseManualRuntime,
  type IManualRuntime,
} from "@time-provider/core";
import { DateTime } from "luxon";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class ManualRuntime extends BaseManualRuntime<DateTime<boolean>> {
  override advanceImpl(
    advanceConfiguration: IAdvanceConfiguration,
  ): IManualRuntime<DateTime<boolean>> {
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
  protected convertToTimestampImpl(time: string | number | DateTime<boolean>): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | DateTime<boolean>): DateTime<boolean> {
    return RuntimeHelper.convertToDate(time);
  }
}
