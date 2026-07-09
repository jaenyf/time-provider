import type { IScheduler } from "./scheduler/IScheduler.ts";

export interface ITimeProvider<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
  parse(input: string | number | TDate): TDate;
  get scheduler(): IScheduler;
}
