import type { DurationMilliseconds, EpochMilliseconds } from "@time-provider/core";

/**
 * How the estimated completion rate is derived from reported progress:
 * - `"complete"` - averaged over the entire tracked history, from the start. Simple and stable,
 *   but a slow start (or a mid-run change of pace) permanently drags the estimate.
 * - `"windowed"` (the default) - averaged over only the most recently reported progress,
 *   discarding older samples. Reacts to a change in pace faster than `"complete"`.
 * - `"smoothed"` - a continuously blended running average, weighted toward more recent reports
 *   without discarding older ones outright.
 */
export type EtaRateAlgorithm = "complete" | "windowed" | "smoothed";

/**
 * Whether a tracked schedule is still running, finished normally, or was called off early.
 * Reported on every notification so a consumer can tell the difference between an ordinary
 * in-progress snapshot and the one final snapshot a schedule ever sends.
 */
export type EtaStatus = "in-progress" | "done" | "abandoned";

/**
 * One stage of a multi-stage job (e.g. download, then process, then finalize), for
 * {@link IEtaTrackBuilder.withStages}. Progress is reported against whichever stage is
 * current - see {@link IStagedProgressEtaTracker.nextStage}.
 */
export interface IEtaStage {
  /**
   * This stage's share of the overall job, relative to the other stages' weights - not required
   * to sum to any particular total across stages, each is normalized against the sum of all of
   * them. A download stage twice as significant as the stage after it can be expressed as
   * `{ weight: 2, total: downloadBytes }` next to `{ weight: 1, total: processSteps }`, exactly
   * as well as `{ weight: 0.66, ... }` next to `{ weight: 0.33, ... }` would be.
   */
  readonly weight: number;
  /**
   * This stage's own total, in whatever unit this stage's progress reports use - unrelated to
   * any other stage's unit.
   */
  readonly total: number;
}

/**
 * Fields describing a schedule's overall completion estimate - shared by
 * {@link IEtaProgressSnapshot} (where "overall" and "the one total" are the same thing) and
 * {@link IStagedEtaProgressSnapshot} (where they're deliberately not - see its doc comment).
 */
export interface IEtaEstimate {
  readonly status: EtaStatus;
  /** The epoch-millisecond timestamp {@link IEtaTrackBuilder.estimate} was called at. */
  readonly startTime: number;
  /** Milliseconds elapsed since `startTime`. */
  readonly elapsedMilliseconds: number;
  /**
   * The estimated completion rate, as a fraction of the whole job (0-1) per millisecond - not
   * scaled to the tracked unit, since {@link IStagedEtaProgressSnapshot} needs this same figure
   * to combine stages that can use different units. `undefined` until the configured
   * {@link EtaRateAlgorithm} has enough samples to estimate one.
   */
  readonly rate?: number;
  /**
   * The estimated epoch-millisecond completion time, or `undefined` until the configured
   * {@link EtaRateAlgorithm} has enough samples to estimate a rate.
   */
  readonly eta?: number;
  /** `eta` expressed as a duration from now, or `undefined` under the same condition as `eta`. */
  readonly remainingMilliseconds?: number;
}

/**
 * The point-in-time state of a known-total schedule, delivered on every notification. Every
 * derived field (`percentage`, `rate`, `remaining`, `remainingMilliseconds`, `eta`) is computed
 * lazily, the moment it's actually read - a consumer that only ever reads `eta` never pays for
 * computing the others.
 */
export interface IEtaProgressSnapshot extends IEtaEstimate {
  /** How much work has been completed so far, in the tracked unit. */
  readonly completed: number;
  /** The known total amount of work, in the tracked unit. */
  readonly total: number;
  /** `total - completed`. */
  readonly remaining: number;
  /** `(completed / total) * 100`. */
  readonly percentage: number;
}

/**
 * The point-in-time state of a multi-stage schedule started via {@link IEtaTrackBuilder.withStages},
 * delivered on every notification. Different stages can use different units (bytes, then rows,
 * then steps), which can't be summed into one meaningful raw figure - so `stageCompleted`/
 * `stageTotal`/`stageRemaining`/`stagePercentage` are local to whichever stage is current (their
 * own natural unit, fit for a per-stage progress bar), while `rate`/`eta`/`remainingMilliseconds`
 * (inherited from {@link IEtaEstimate}) are weighted across every stage per
 * {@link IEtaStage.weight} (unit-less/normalized figures, which *can* be combined), answering
 * "when does the whole job finish" rather than just the current stage. Deliberately doesn't
 * extend {@link IEtaProgressSnapshot} - stage-scoped and overall fields would otherwise share the
 * same names for different things.
 */
export interface IStagedEtaProgressSnapshot extends IEtaEstimate {
  /** How much work has been completed so far in the current stage, in that stage's own unit. */
  readonly stageCompleted: number;
  /** The current stage's own total, in that stage's own unit. */
  readonly stageTotal: number;
  /** `stageTotal - stageCompleted`. */
  readonly stageRemaining: number;
  /** `(stageCompleted / stageTotal) * 100`. */
  readonly stagePercentage: number;
  /** The index, into the array given to {@link IEtaTrackBuilder.withStages}, of the stage
   * currently being reported against. */
  readonly currentStageIndex: number;
  /** The number of stages given to {@link IEtaTrackBuilder.withStages}. */
  readonly stageCount: number;
}

/**
 * The point-in-time state of an estimated-duration schedule, delivered on every notification.
 * Unlike {@link IEtaProgressSnapshot}, there's no progress data backing this - `eta` is always
 * known immediately (`startTime + expectedDuration`), until {@link IDurationEtaTracker.abandon}
 * is called, after which there's nothing left to estimate.
 */
export interface IEtaDurationSnapshot {
  readonly status: EtaStatus;
  readonly startTime: EpochMilliseconds;
  readonly elapsedMilliseconds: DurationMilliseconds;
  /** `undefined` only once `status` is `"abandoned"`. */
  readonly eta?: EpochMilliseconds;
  /** `undefined` only once `status` is `"abandoned"`. */
  readonly remainingMilliseconds?: DurationMilliseconds;
}

/**
 * Returned by {@link IEtaTrackBuilder.withKnownTotal}. Reports progress toward a single known
 * total.
 */
export interface IProgressEtaTracker {
  /** Reports that `chunkSize` more work has been completed, relative to the last reported
   * amount. */
  progress(chunkSize: number): void;
  /** Reports that `completed` amount of work has been done in total, replacing the last reported
   * amount. */
  progressTo(completed: number): void;
  /**
   * Marks the job as complete: the final notification reports 100% regardless of the last
   * reported amount, and no further notifications follow.
   */
  done(): void;
  /**
   * Calls off tracking without completing it: the final notification reports whatever progress
   * was last recorded, with `eta`/`remainingMilliseconds` unset - there's nothing left to project
   * forward. `rate` stays set to the last measured pace. No further notifications follow.
   */
  abandon(): void;
}

/**
 * Returned by {@link IEtaTrackBuilder.withStages}. Same as {@link IProgressEtaTracker}, with
 * progress reported against whichever stage is current.
 */
export interface IStagedProgressEtaTracker extends IProgressEtaTracker {
  /**
   * Marks the current stage complete and moves on to the next one declared in
   * {@link IEtaTrackBuilder.withStages}, resetting the amount of work done so far back to `0` for
   * that new stage.
   * @throws if called on the last stage - there's no next stage to move to; call
   * {@link IProgressEtaTracker.done} instead.
   */
  nextStage(): void;
}

/** Returned by {@link IEtaTrackBuilder.withEstimatedDuration}. */
export interface IDurationEtaTracker {
  /** Marks the job as complete. No further notifications follow. */
  done(): void;
  /** Calls off tracking without completing it. No further notifications follow. */
  abandon(): void;
}

/**
 * Configures a known-total or multi-stage schedule, started via
 * {@link IProgressEtaTrackBuilder.start}.
 */
export interface IProgressEtaTrackBuilder {
  /** How often `start`'s callback is notified, in milliseconds. Defaults to `1000`, clamped to
   * `0` if negative. */
  withNotificationInterval(milliseconds: number): this;
  /** Which {@link EtaRateAlgorithm} estimates the completion rate. Defaults to `"windowed"`. */
  withAlgorithm(algorithm: EtaRateAlgorithm): this;
  /**
   * Starts the schedule, delivering a snapshot to `notify` on the configured notification
   * interval, until {@link IProgressEtaTracker.done} or {@link IProgressEtaTracker.abandon} is
   * called.
   */
  start(notify: (snapshot: IEtaProgressSnapshot) => void): IProgressEtaTracker;
}

/** {@link IProgressEtaTrackBuilder} for a multi-stage schedule. */
export interface IStagedProgressEtaTrackBuilder {
  /** How often `start`'s callback is notified, in milliseconds. Defaults to `1000`, clamped to
   * `0` if negative. */
  withNotificationInterval(milliseconds: number): this;
  /** Which {@link EtaRateAlgorithm} estimates the completion rate. Defaults to `"windowed"`. */
  withAlgorithm(algorithm: EtaRateAlgorithm): this;
  /**
   * Starts the schedule, delivering a snapshot to `notify` on the configured notification
   * interval, until {@link IStagedProgressEtaTracker.done} or
   * {@link IStagedProgressEtaTracker.abandon} is called.
   */
  start(notify: (snapshot: IStagedEtaProgressSnapshot) => void): IStagedProgressEtaTracker;
}

/** Configures an estimated-duration schedule, started via {@link IDurationEtaTrackBuilder.start}. */
export interface IDurationEtaTrackBuilder {
  /** How often `start`'s callback is notified, in milliseconds. Defaults to `1000`, clamped to
   * `0` if negative. */
  withNotificationInterval(milliseconds: number): this;
  /**
   * Starts the schedule, delivering a snapshot to `notify` on the configured notification
   * interval, until {@link IDurationEtaTracker.done} or {@link IDurationEtaTracker.abandon} is
   * called.
   */
  start(notify: (snapshot: IEtaDurationSnapshot) => void): IDurationEtaTracker;
}

/**
 * Entry point for a single ETA schedule, returned by {@link IEtaApi.estimate}. Picking a branch
 * here decides the whole shape of what follows - a known-total or multi-stage schedule reports
 * progress and gets a data-driven `eta`; an estimated-duration schedule reports nothing and gets
 * a fixed `eta` computed once, up front.
 */
export interface IEtaTrackBuilder {
  /**
   * Tracks progress toward a single known total, in whatever unit fits (bytes, tasks, ...).
   * @throws if `total` is negative.
   */
  withKnownTotal(total: number): IProgressEtaTrackBuilder;
  /**
   * Tracks progress across multiple weighted stages (e.g. download, then process, then
   * finalize) as one overall schedule - see {@link IEtaStage}.
   * @throws if `stages` is empty, any stage's `weight` is negative, or every stage's `weight` is
   * `0`.
   */
  withStages(stages: readonly IEtaStage[]): IStagedProgressEtaTrackBuilder;
  /**
   * No progress signal at all - just a rough prior of how long the job usually takes. `eta` is
   * `startTime + expectedDurationMilliseconds`, fixed for the life of the schedule - until
   * {@link IDurationEtaTracker.done} snaps it to the actual completion time, or
   * {@link IDurationEtaTracker.abandon} clears it.
   * @throws if `expectedDurationMilliseconds` is negative.
   */
  withEstimatedDuration(expectedDurationMilliseconds: number): IDurationEtaTrackBuilder;
}

/**
 * The shape this addon adds to a composed Time-Provider: an `eta` property exposing
 * {@link IEtaApi}.
 */
export type WithEtaApi<TDate> = {
  /**
   * Estimates when a tracked job will finish, either from progress reported toward a known total
   * (optionally split into weighted stages) or from a fixed expected duration, notifying a
   * callback with a snapshot on an interval - see {@link IEtaApi}.
   */
  eta: IEtaApi<TDate>;
};

/**
 * The ETA API facade this addon adds to a composed Time-Provider, reachable as
 * `timeProvider.eta` once composed via `createTimeProvider.for(plugin).use(thisAddon)`. Doesn't
 * extend `IAddon<TDate>` (unlike the underlying `EtaScheduler`): the facade actually reachable at
 * `.eta` deliberately drops the addon's own lifecycle members (`.runtime`, `.applyToRuntime`,
 * `.dispose`, `.isDisposed`) - a consumer has no business calling those - so the type shouldn't
 * promise them either.
 */
// Kept generic over TDate for symmetry with WithEtaApi<TDate> and the rest of the *Api<TDate>
// family, even though no member here happens to reference it.
// oxlint-disable-next-line no-unused-vars
export interface IEtaApi<TDate> {
  /** Starts configuring a new ETA schedule - see {@link IEtaTrackBuilder}. */
  estimate(): IEtaTrackBuilder;
}
