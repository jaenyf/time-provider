import type { IParserProvider } from "../parser/IParserProvider.ts";
import type { ISchedulerProvider } from "../scheduler/ISchedulerProvider.ts";
import type { IClockProvider } from "../clock/IClockProvider.ts";
import type { IClock } from "../clock/IClock.ts";
import type { IUtcOnlyClock } from "../clock/IUtcOnlyClock.ts";
import type { IParser } from "../parser/IParser.ts";
import type { IUtcOnlyParser } from "../parser/IUtcOnlyParser.ts";

export interface ITimeProvider<TDate>
  extends IClockProvider<IClock<TDate>>, ISchedulerProvider, IParserProvider<IParser<TDate>> {}

export interface IUtcOnlyTimeProvider<TDate>
  extends
    IClockProvider<IUtcOnlyClock<TDate>>,
    ISchedulerProvider,
    IParserProvider<IUtcOnlyParser<TDate>> {}
