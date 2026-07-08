import type { IManualTimeAdapter } from "./IManualTimeAdapter.ts";
import type { ITimeAdapter } from "./ITimeAdapter.ts";

export interface IPlugin<TDate> {
  createTimeAdapter(): ITimeAdapter<TDate>;
  createManualTimeAdapter(initialTime: string | number | TDate): IManualTimeAdapter<TDate>;
  createFixedTimeAdapter(initialTime: string | number | TDate): ITimeAdapter<TDate>;
  createSequentialTimeAdapter(sequentialTimes: (string | number | TDate)[]): ITimeAdapter<TDate>;
}
