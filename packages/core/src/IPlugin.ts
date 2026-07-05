import type { IManualTimeAdapter } from "./IManualTimeAdapter.ts";
import type { ITimeAdapter } from "./ITimeAdapter.ts";

export interface IPlugin<TDate> {
  createTimeAdapter(): ITimeAdapter<TDate>;
  createManualAdapter(initialTime?: string | number | TDate): IManualTimeAdapter<TDate>;
  createFixedAdapter(initialTime: string | number | TDate): ITimeAdapter<TDate>;
}
