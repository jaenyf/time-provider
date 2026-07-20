import type { IParserProvider } from "../parser/IParserProvider.ts";
import type { ISchedulerProvider } from "../scheduler/ISchedulerProvider.ts";
import type { IClockProvider } from "../clock/IClockProvider.ts";
import type { IManualClock } from "../clock/IManualClock.ts";
import type { IUtcOnlyManualClock } from "../clock/IUtcOnlyManualClock.ts";
import type { IParser } from "../parser/IParser.ts";
import type { IUtcOnlyParser } from "../parser/IUtcOnlyParser.ts";

export interface IManualTimeProvider<TDate>
  extends
    IClockProvider<IManualClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IParser<TDate>> {}

export interface IUtcOnlyManualTimeProvider<TDate>
  extends
    IClockProvider<IUtcOnlyManualClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IUtcOnlyParser<TDate>> {}
