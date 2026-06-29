import type { ITimeAdapter } from "./ITimeAdapter.ts";

export abstract class BaseFixedTimeAdapter<TDate> implements ITimeAdapter<TDate> {
  #fixedDate: TDate;
  constructor(fixedDate: string | number | TDate) {
    this.#fixedDate = this.createFixedTime(fixedDate);
  }

  abstract createFixedTime(fixedDate: string | number | TDate): TDate;

  localNow = () => this.createFixedTime(this.#fixedDate);
  utcNow = () => this.createFixedTime(this.#fixedDate);
  parse = (input: string | number | TDate) => this.createFixedTime(input);
}
