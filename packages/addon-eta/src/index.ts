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

/** The ETA estimation addon for a system (real time) Time-Provider. */
// export const addon = function <TDate>() {
//   return new EtaScheduler<TDate>();
// };
export const addon = EtaScheduler;
export default addon;
