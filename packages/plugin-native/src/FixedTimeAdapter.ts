import { BaseDeterministicTimeAdapter } from "@time-provider/core";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<Date> {
  constructor(time: string | number | Date) {
    super(time);
  }
  protected convertToDateImpl(time: string | number | Date): Date {
    return new Date(time);
  }
}
