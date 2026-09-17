import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { EtaScheduler } from "./eta-scheduler.ts";
import type { WithEtaApi } from "./types.ts";

export type {
  EtaRateAlgorithm,
  EtaStatus,
  IDurationEtaTracker,
  IDurationEtaTrackBuilder,
  IEtaApi,
  IEtaDurationSnapshot,
  IEtaStage,
  IEtaProgressSnapshot,
  IEtaTrackBuilder,
  IStagedEtaProgressSnapshot,
  IStagedProgressEtaTracker,
  IStagedProgressEtaTrackBuilder,
  IProgressEtaTracker,
  IProgressEtaTrackBuilder,
  WithEtaApi,
} from "./types.ts";
export { EtaScheduler } from "./eta-scheduler.ts";

type DeterministicEtaAddon<TDate> = WithEtaApi<TDate> & IDeterministicAddon<TDate>;

class DeterministicEtaAddonBuilder<TDate> extends AddonBuilderBase<
  TDate,
  DeterministicEtaAddon<TDate>
> {
  create(): DeterministicEtaAddon<TDate> {
    return new EtaScheduler<TDate>() as unknown as DeterministicEtaAddon<TDate>;
  }
}

/**
 * The ETA estimation addon-builder for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)`. Same {@link EtaScheduler} implementation as the
 * system addon-builder in `./addon.ts` - it never touches anything deterministic-specific -
 * re-exposed here typed against `IDeterministicAddon` so it satisfies a deterministic
 * runtime-builder's `.use()` bound.
 * @param typeHint never read - lets `.use()` infer `TDate` from this factory. See
 * `AddonBuilderFactory` in `@time-provider/core`.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<DeterministicEtaAddon<TDate>> {
  return new DeterministicEtaAddonBuilder<TDate>(typeHint);
}
export default addon;
