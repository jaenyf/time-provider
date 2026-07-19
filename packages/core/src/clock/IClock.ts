import type { ILocalOnlyClock } from "./ILocalOnlyClock.ts";
import type { IUtcOnlyClock } from "./IUtcOnlyClock.ts";

export interface IClock<TDate> extends IUtcOnlyClock<TDate>, ILocalOnlyClock<TDate> {}
