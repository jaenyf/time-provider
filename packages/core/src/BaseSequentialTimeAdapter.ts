import { BaseTimeAdapter } from "./BaseTimeAdapter.ts";

export abstract class BaseSequentialTimeAdapter<TDate> extends BaseTimeAdapter<TDate> {
  #sequentialTimes: TDate[];
  constructor(sequentialTimes: (string | number | TDate)[]) {
    super();
    this.#sequentialTimes = sequentialTimes.map((t) => this.convertToDateImpl(t));
  }

  private getNextSequentialTime(): TDate {
    return this.#sequentialTimes.length > 1
      ? (this.#sequentialTimes.shift() as TDate)
      : this.#sequentialTimes.length > 0
        ? this.#sequentialTimes[0]
        : this.convertToDateImpl(0);
  }

  localNow = () => this.getNextSequentialTime();
  utcNow = () => this.getNextSequentialTime();
  parse = (input: string | number | TDate) => this.convertToDateImpl(input);
}
