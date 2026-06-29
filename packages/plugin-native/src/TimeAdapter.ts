import { BaseTimeAdapter } from "@time-provider/core";

export class TimeAdapter extends BaseTimeAdapter<Date> {
  localNow = () => new Date();
  utcNow = () => new Date();
  parse = (input: string | number | Date) => new Date(input);
}
