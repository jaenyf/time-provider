import { BaseTimeAdapter } from "./BaseTimeAdapter.ts";

export abstract class BaseDeterministicTimeAdapter<TDate> extends BaseTimeAdapter<TDate> {
  #deterministicTime: TDate;
  constructor(determinedTime: string | number | TDate) {
    super();
    this.#deterministicTime = this.convertToDateImpl(determinedTime);
  }

  protected setDeterminedTime(determinedTime: TDate): void {
    this.#deterministicTime = this.convertToDateImpl(determinedTime);
  }

  localNow = () => this.convertToDateImpl(this.#deterministicTime);
  utcNow = () => this.convertToDateImpl(this.#deterministicTime);
  parse = (input: string | number | TDate) => this.convertToDateImpl(input);
}
