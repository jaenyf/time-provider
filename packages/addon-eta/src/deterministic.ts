/** Deterministic ETA estimation addon.
 * @module */
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
 * Deterministic ETA addon builder.
 * @param typeHint Infers `TDate`; unused.
 */
export function addon<TDate>(typeHint?: TDate): IAddonBuilder<DeterministicEtaAddon<TDate>> {
  return new DeterministicEtaAddonBuilder<TDate>(typeHint);
}
export default addon;
