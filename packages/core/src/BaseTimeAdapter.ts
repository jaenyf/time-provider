import type { ITimeAdapter } from "./ITimeAdapter.ts";

export abstract class BaseTimeAdapter<TDate> implements ITimeAdapter<TDate> {
  abstract localNow(): TDate;
  abstract utcNow(): TDate;

  parse = (time: string | number | TDate) => this.convertToDateImpl(time);

  protected abstract convertToDateImpl(time: string | number | TDate): TDate;
}
