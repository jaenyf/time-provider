import { AddonBuilderBase, type IAddonBuilder, type ISystemAddon } from "@time-provider/core";
import { EtaScheduler } from "./eta-scheduler.ts";
import type { WithEtaApi } from "./types.ts";

type EtaAddon<TDate> = WithEtaApi<TDate> & ISystemAddon<TDate>;

class EtaAddonBuilder<TDate> extends AddonBuilderBase<TDate, EtaAddon<TDate>> {
  create(): EtaAddon<TDate> {
    return new EtaScheduler<TDate>() as unknown as EtaAddon<TDate>;
  }
}

/**
 * ETA addon builder.
 * @param typeHint Infers `TDate`; unused.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<EtaAddon<TDate>> {
  return new EtaAddonBuilder<TDate>(typeHint);
}
