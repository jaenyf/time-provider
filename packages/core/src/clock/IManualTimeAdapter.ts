import type { ITimeAdapter } from "./ITimeAdapter.ts";

export interface IAdvanceConfiguration {
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  years?: number;
  months?: number;
  days?: number;
}

export interface IManualTimeAdapter<TDate> extends ITimeAdapter<TDate> {
  advance(advanceConfiguration: IAdvanceConfiguration): IManualTimeAdapter<TDate>;
}
