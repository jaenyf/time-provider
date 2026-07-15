import type { IClock } from "./IClock.ts";

export interface IAdvanceConfiguration {
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  years?: number;
  months?: number;
  days?: number;
}

export interface IManualClock<TDate> extends IClock<TDate> {
  advance(advanceConfiguration: IAdvanceConfiguration): IManualClock<TDate>;
}
