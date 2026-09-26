import { AddonBuilderBase, type ISystemAddon, type IAddonBuilder } from "@time-provider/core";
import { SystemIdleScheduler } from "./system-idle-scheduler.ts";
import type { WithIdleApi } from "./types.ts";

type SystemIdleAddon<TDate> = WithIdleApi & ISystemAddon<TDate>;

class SystemIdleAddonBuilder<TDate> extends AddonBuilderBase<TDate, SystemIdleAddon<TDate>> {
  create(): SystemIdleAddon<TDate> {
    return new SystemIdleScheduler<TDate>() as unknown as SystemIdleAddon<TDate>;
  }
}

/**
 * System idle addon builder. Adds `idle` backed by the host's
 * `requestIdleCallback`/`cancelIdleCallback`.
 * @param typeHint Unused; lets `.use()` infer `TDate`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<SystemIdleAddon<TDate>> {
  return new SystemIdleAddonBuilder<TDate>(typeHint);
}
