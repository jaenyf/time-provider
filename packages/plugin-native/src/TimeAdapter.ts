import { BaseTimeAdapter } from "@time-provider/core";

export class TimeAdapter extends BaseTimeAdapter<Date> {
  localNow = () => new Date();
  utcNow = () => new Date();
  protected convertToDateImpl = (time: string | number | Date) => new Date(time);
}
