import { EtaScheduler } from "./eta-scheduler.ts";

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

/**
 * The ETA estimation addon for a deterministic Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add an `eta` property backed by the runtime's
 * own simulated clock instead of the host's real clock.
 */
// export const addon = function <TDate>() {
//   return new EtaScheduler<TDate>();
// };
export const addon = EtaScheduler;
export default addon;
