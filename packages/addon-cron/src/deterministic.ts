/** Deterministic cron addon.
 * @module */
import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { CronScheduler } from "./cron-scheduler.ts";
import type { WithCronApi } from "./types.ts";

export type { ICronApi, WithCronApi } from "./types.ts";
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

type DeterministicCronAddon<TDate> = WithCronApi<TDate> & IDeterministicAddon<TDate>;

class DeterministicCronAddonBuilder<TDate> extends AddonBuilderBase<
  TDate,
  DeterministicCronAddon<TDate>
> {
  create(): DeterministicCronAddon<TDate> {
    return new CronScheduler<TDate>() as unknown as DeterministicCronAddon<TDate>;
  }
}

/**
 * Deterministic cron addon builder.
 * @param typeHint Infers `TDate`; unused.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<DeterministicCronAddon<TDate>> {
  return new DeterministicCronAddonBuilder<TDate>(typeHint);
}
export default addon;
