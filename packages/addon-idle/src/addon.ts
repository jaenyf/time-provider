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
 * The idle addon-builder for a system (real time) Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `idle` property backed by the host's real
 * `requestIdleCallback`/`cancelIdleCallback`.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<SystemIdleAddon<TDate>> {
  return new SystemIdleAddonBuilder<TDate>(typeHint);
}
