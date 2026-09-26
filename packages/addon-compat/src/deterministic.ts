/** Deterministic compatibility addon.
 * @module */
import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { CompatRuntime } from "./compat-runtime.ts";
import type { WithCompatApi } from "./types.ts";

export type {
  ICompatApi,
  IPerformanceEntry,
  PerformanceEntryType,
  WithCompatApi,
} from "./types.ts";
export { CompatRuntime } from "./compat-runtime.ts";

type DeterministicCompatAddon<TDate> = WithCompatApi<TDate> & IDeterministicAddon<TDate>;

class DeterministicCompatAddonBuilder<TDate> extends AddonBuilderBase<
  TDate,
  DeterministicCompatAddon<TDate>
> {
  create(): DeterministicCompatAddon<TDate> {
    return new CompatRuntime<TDate>(false) as unknown as DeterministicCompatAddon<TDate>;
  }
}

/**
 * Deterministic compat addon builder.
 * @param typeHint Infers `TDate`; unused.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<DeterministicCompatAddon<TDate>> {
  return new DeterministicCompatAddonBuilder<TDate>(typeHint);
}
export default addon;
