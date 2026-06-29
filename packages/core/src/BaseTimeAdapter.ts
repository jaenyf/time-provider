import type { ITimeAdapter } from "./ITimeAdapter.ts";

export abstract class BaseTimeAdapter<TDate> implements ITimeAdapter<TDate> {
  abstract localNow(): TDate;
  abstract utcNow(): TDate;
  abstract parse(input: string | number | TDate): TDate;
}
