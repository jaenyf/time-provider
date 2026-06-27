import { type Adapter } from "@time-provider/core";

export class TimeAdapter implements Adapter<Date> {
  localNow = () => new Date();
  utcNow = () => new Date();
  parse = (input: string | number | Date) => new Date(input);
}
