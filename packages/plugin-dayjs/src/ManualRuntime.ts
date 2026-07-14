import {
  type IAdvanceConfiguration,
  BaseManualRuntime,
  type IManualRuntime,
} from "@time-provider/core";
import dayjs from "dayjs";
import { RuntimeHelper } from "./RuntimeHelper.ts";

export class ManualRuntime extends BaseManualRuntime<dayjs.Dayjs> {
  override advanceImpl(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<dayjs.Dayjs> {
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
  protected convertToTimestampImpl(time: string | number | dayjs.Dayjs): number {
    return RuntimeHelper.convertToTimestamp(time);
  }
  protected convertToDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return RuntimeHelper.convertToDate(time);
  }
}
