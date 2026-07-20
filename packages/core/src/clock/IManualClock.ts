import type { IAdvanceable } from "./IAdvanceable.ts";
import type { IClock } from "./IClock.ts";

export interface IManualClock<TDate> extends IClock<TDate>, IAdvanceable<IManualClock<TDate>> {}
