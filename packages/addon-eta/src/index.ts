import { AddonHelper, type ISystemAddon } from "@time-provider/core";
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

function createAddon<TDate>(): ISystemAddon<TDate, WithEtaApi> {
  return {
    applyToRuntime(runtime) {
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "eta",
        new EtaScheduler(runtime.scheduler, () => runtime.clock.timestampNow()),
        undefined as unknown as WithEtaApi,
      );
    },
    clone(): ISystemAddon<TDate, WithEtaApi> {
      return createAddon<TDate>();
    },
  };
}

/** The ETA estimation addon for a system (real time) Time-Provider. */
export const addon: ISystemAddon<unknown, WithEtaApi> = createAddon();
export default addon;
