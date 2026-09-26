import { AddonBuilderBase, type IAddonBuilder, type ISystemAddon } from "@time-provider/core";
import { CompatRuntime } from "./compat-runtime.ts";
import type { WithCompatApi } from "./types.ts";

type CompatAddon<TDate> = WithCompatApi<TDate> & ISystemAddon<TDate>;

class CompatAddonBuilder<TDate> extends AddonBuilderBase<TDate, CompatAddon<TDate>> {
  create(): CompatAddon<TDate> {
    return new CompatRuntime<TDate>(true) as unknown as CompatAddon<TDate>;
  }
}

/**
 * Compat addon builder.
 * @param typeHint Infers `TDate`; unused.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<CompatAddon<TDate>> {
  return new CompatAddonBuilder<TDate>(typeHint);
}
