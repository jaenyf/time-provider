import type { DurationMilliseconds, EpochMilliseconds } from "@time-provider/core";

/** How completion rate is estimated from progress samples. */
export type EtaRateAlgorithm = "complete" | "windowed" | "smoothed";

/** Whether tracking is running, done, or abandoned. */
export type EtaStatus = "in-progress" | "done" | "abandoned";

/** A weighted stage in a multi-stage job. */
export interface IEtaStage {
  /** Relative stage weight. */
  readonly weight: number;
  /** Stage-local total. */
  readonly total: number;
}

/** Overall completion estimate fields. */
export interface IEtaEstimate {
  readonly status: EtaStatus;
  /** Epoch timestamp when tracking started. */
  readonly startTime: number;
  /** Elapsed milliseconds since `startTime`. */
  readonly elapsedMilliseconds: number;
  /** Overall completion rate per millisecond. */
  readonly rate?: number;
  /** Estimated completion timestamp. */
  readonly eta?: number;
  /** Estimated time remaining. */
  readonly remainingMilliseconds?: number;
}

/** Snapshot of known-total progress. */
export interface IEtaProgressSnapshot extends IEtaEstimate {
  /** Completed work. */
  readonly completed: number;
  /** Total work. */
  readonly total: number;
  /** Remaining work. */
  readonly remaining: number;
  /** Completion percentage. */
  readonly percentage: number;
}

/** Snapshot of multi-stage progress. */
export interface IStagedEtaProgressSnapshot extends IEtaEstimate {
  /** Completed work in the current stage. */
  readonly stageCompleted: number;
  /** Current stage total. */
  readonly stageTotal: number;
  /** Remaining work in the current stage. */
  readonly stageRemaining: number;
  /** Current-stage completion percentage. */
  readonly stagePercentage: number;
  /** Current stage index. */
  readonly currentStageIndex: number;
  /** Total stage count. */
  readonly stageCount: number;
}

/** Snapshot of an estimated-duration schedule. */
export interface IEtaDurationSnapshot {
  readonly status: EtaStatus;
  readonly startTime: EpochMilliseconds;
  readonly elapsedMilliseconds: DurationMilliseconds;
  /** `undefined` only when abandoned. */
  readonly eta?: EpochMilliseconds;
  /** `undefined` only when abandoned. */
  readonly remainingMilliseconds?: DurationMilliseconds;
}

/** Tracks progress toward a known total. */
export interface IProgressEtaTracker {
  /** Reports additional completed work. */
  progress(chunkSize: number): void;
  /** Sets total completed work. */
  progressTo(completed: number): void;
  /** Completes tracking. */
  done(): void;
  /** Abandons tracking. */
  abandon(): void;
}

/** Tracks progress across multiple stages. */
export interface IStagedProgressEtaTracker extends IProgressEtaTracker {
  /**
   * Completes the current stage and moves to the next.
   * @throws If called on the last stage.
   */
  nextStage(): void;
}

/** Tracks an estimated-duration schedule. */
export interface IDurationEtaTracker {
  /** Completes tracking. */
  done(): void;
  /** Abandons tracking. */
  abandon(): void;
}

/** Configures known-total progress tracking. */
export interface IProgressEtaTrackBuilder {
  /** Sets notification interval; defaults to `1000`, clamped to `0`. */
  withNotificationInterval(milliseconds: number): this;
  /** Sets the rate algorithm; defaults to `"windowed"`. */
  withAlgorithm(algorithm: EtaRateAlgorithm): this;
  /** Starts tracking until `done()` or `abandon()`. */
  start(notify: (snapshot: IEtaProgressSnapshot) => void): IProgressEtaTracker;
}

/** Configures multi-stage progress tracking. */
export interface IStagedProgressEtaTrackBuilder {
  /** Sets notification interval; defaults to `1000`, clamped to `0`. */
  withNotificationInterval(milliseconds: number): this;
  /** Sets the rate algorithm; defaults to `"windowed"`. */
  withAlgorithm(algorithm: EtaRateAlgorithm): this;
  /** Starts tracking until `done()` or `abandon()`. */
  start(notify: (snapshot: IStagedEtaProgressSnapshot) => void): IStagedProgressEtaTracker;
}

/** Configures estimated-duration tracking. */
export interface IDurationEtaTrackBuilder {
  /** Sets notification interval; defaults to `1000`, clamped to `0`. */
  withNotificationInterval(milliseconds: number): this;
  /** Starts tracking until `done()` or `abandon()`. */
  start(notify: (snapshot: IEtaDurationSnapshot) => void): IDurationEtaTracker;
}

/** Configures an ETA schedule. */
export interface IEtaTrackBuilder {
  /**
   * Tracks progress toward a known total.
   * @throws If `total` is negative.
   */
  withKnownTotal(total: number): IProgressEtaTrackBuilder;

  /**
   * Tracks weighted stages.
   * @throws If `stages` is empty, any weight is negative, or all weights are `0`.
   */
  withStages(stages: readonly IEtaStage[]): IStagedProgressEtaTrackBuilder;

  /**
   * Tracks an estimated duration.
   * @throws If `expectedDurationMilliseconds` is negative.
   */
  withEstimatedDuration(expectedDurationMilliseconds: number): IDurationEtaTrackBuilder;
}

/** Adds `eta` to a composed Time-Provider. */
export type WithEtaApi<TDate> = {
  /** ETA API facade. */
  eta: IEtaApi<TDate>;
};

/** ETA API exposed by the addon. */
// Kept generic over TDate for symmetry with WithEtaApi<TDate> and the rest of the *Api<TDate>
// family, even though no member here happens to reference it.
// oxlint-disable-next-line no-unused-vars
export interface IEtaApi<TDate> {
  /** Starts configuring an ETA schedule. */
  estimate(): IEtaTrackBuilder;
}
