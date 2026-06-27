import type { Adapter } from "./Adapter.ts";
import type { Provider } from "./Provider.ts";

export class TimeProviderCreator {
  for = <TDate>(adapter: Adapter<TDate>): Provider<TDate> => adapter;
}
