import type { IScheduler } from "../scheduler/IScheduler.ts";
import type { ITimeAdapter } from "./ITimeAdapter.ts";

export abstract class BaseTimeAdapter<TDate> implements ITimeAdapter<TDate> {
  #scheduler: IScheduler;
  constructor(scheduler: IScheduler) {
    this.#scheduler = scheduler;
  }

  get scheduler(): IScheduler {
    return this.#scheduler;
  }
  abstract localNow(): TDate;
  abstract utcNow(): TDate;

  parse = (time: string | number | TDate) => this.convertToDateImpl(time);

  protected abstract convertToDateImpl(time: string | number | TDate): TDate;
}
