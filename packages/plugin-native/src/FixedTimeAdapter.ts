import { BaseDeterministicTimeAdapter } from "@time-provider/core";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<Date> {
  protected createDeterminedTime(determinedTime: string | number | Date): Date {
    return new Date(determinedTime);
  }
}
