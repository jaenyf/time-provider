import { BaseFixedTimeAdapter } from "@time-provider/core";

export class FixedTimeAdapter extends BaseFixedTimeAdapter<Date> {
  createFixedTime(fixedDate: string | number | Date): Date {
    return new Date(fixedDate);
  }
}
