import type { ISystemAddon } from "@time-provider/core";
import { addon as sharedAddon } from "./addon.ts";
import type { WithCronApi } from "./types.ts";

export type { ICronApi } from "./types.ts";
export { CronScheduler } from "./cron-scheduler.ts";
export {
  parseCronExpression,
  computeNextOccurrence,
  parseCronSpec,
  cronExpressionToSpec,
} from "./cron-parser.ts";
export type {
  ParsedCronExpression,
  ICronSpec,
  CronNumericFieldSpec,
  CronMonthFieldSpec,
  CronDayOfWeekFieldSpec,
  CronNumericRangeSpec,
  CronMonthRangeSpec,
  CronDayOfWeekRangeSpec,
  MonthName,
  DayOfWeekName,
  NumericString,
} from "./cron-parser.ts";

export const addon: ISystemAddon<unknown, WithCronApi> = sharedAddon;
export default addon;
