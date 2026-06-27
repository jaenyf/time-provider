import { type Adapter } from "@time-provider/core";

export class FixedTimeAdapter implements Adapter<Date> {
  #fixedDate: Date;
  constructor(fixedDate: string | number | Date) {
    this.#fixedDate = new Date(fixedDate);
  }

  localNow = () => new Date(this.#fixedDate);
  utcNow = () => new Date(this.#fixedDate);
  parse = (input: string | number | Date) => new Date(input);
}
