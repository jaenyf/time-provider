import type { ITimeAdapter } from "./ITimeAdapter.ts";

export abstract class BaseDeterministicTimeAdapter<TDate> implements ITimeAdapter<TDate> {
  #deterministicTime: TDate;
  constructor(determinedTime: string | number | TDate) {
    this.#deterministicTime = this.createDeterminedTime(determinedTime);
  }

  protected abstract createDeterminedTime(determinedTime: string | number | TDate): TDate;

  protected setDeterminedTime(determinedTime: TDate): void {
    this.#deterministicTime = this.createDeterminedTime(determinedTime);
  }

  localNow = () => this.createDeterminedTime(this.#deterministicTime);
  utcNow = () => this.createDeterminedTime(this.#deterministicTime);
  parse = (input: string | number | TDate) => this.createDeterminedTime(input);
}
