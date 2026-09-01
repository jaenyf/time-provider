import type { IAddonBuilder } from "@time-provider/core";
import { EtaScheduler } from "./eta-scheduler.ts";

/**
 * The ETA estimation addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `eta` property.
 */
export function addon<TDate>(): IAddonBuilder<EtaScheduler<TDate>> {
  return { create: () => new EtaScheduler<TDate>() };
}
