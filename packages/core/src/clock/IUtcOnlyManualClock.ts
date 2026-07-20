import type { IAdvanceable } from "./IAdvanceable.ts";
import type { IUtcOnlyClock } from "./IUtcOnlyClock.ts";

export interface IUtcOnlyManualClock<TDate>
  extends IUtcOnlyClock<TDate>, IAdvanceable<IUtcOnlyManualClock<TDate>> {}
