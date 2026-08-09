import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { AddonHelper } from "@time-provider/core";
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
} from "./types.ts";
export { EtaScheduler } from "./eta-scheduler.ts";

function createAddon<TDate>(): IDeterministicAddon<TDate, WithEtaApi> {
  return {
    applyToRuntime(runtime) {
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "eta",
        new EtaScheduler(runtime.scheduler, () => runtime.clock.timestampNow()),
        undefined as unknown as WithEtaApi,
      );
    },
    clone(): IDeterministicAddon<TDate, WithEtaApi> {
      return createAddon<TDate>();
    },
  };
}

/**
 * The ETA estimation addon for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `eta` property backed by the runtime's
 * own simulated clock instead of the host's real clock.
 */
export const addon: IDeterministicAddon<unknown, WithEtaApi> = createAddon();
export default addon;
