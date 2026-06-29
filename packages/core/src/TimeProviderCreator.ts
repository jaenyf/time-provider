import type { ITimeAdapter } from "./ITimeAdapter.ts";
import type { ITimeProvider } from "./ITimeProvider.ts";

export class TimeProviderCreator {
  for = <TDate>(adapter: ITimeAdapter<TDate>): ITimeProvider<TDate> => adapter;
}
