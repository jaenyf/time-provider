import type { IRuntime } from "./IRuntime.ts";

export interface IAdvanceConfiguration {
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  years?: number;
  months?: number;
  days?: number;
}

export interface IManualRuntime<TDate> extends IRuntime<TDate> {
  advance(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<TDate>;
}
