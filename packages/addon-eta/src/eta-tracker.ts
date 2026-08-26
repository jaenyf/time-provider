import {
  type IScheduledHandle,
  type DurationMilliseconds,
  type EpochMilliseconds,
  epochArithmetic,
  type IRuntime,
} from "@time-provider/core";
import { createRateEstimator, type IRateEstimator } from "./rate-estimator.ts";
import { EtaDurationSnapshot, StagedEtaProgressSnapshot } from "./eta-snapshot.ts";
import type {
  EtaRateAlgorithm,
  IDurationEtaTracker,
  IDurationEtaTrackBuilder,
  IEtaDurationSnapshot,
  IEtaStage,
  IEtaProgressSnapshot,
  IEtaTrackBuilder,
  IStagedEtaProgressSnapshot,
  IStagedProgressEtaTrackBuilder,
  IStagedProgressEtaTracker,
  IProgressEtaTrackBuilder,
  IProgressEtaTracker,
} from "./types.ts";

const DEFAULT_NOTIFICATION_INTERVAL_MILLISECONDS: DurationMilliseconds =
  1000 as DurationMilliseconds;
const DEFAULT_ALGORITHM: EtaRateAlgorithm = "windowed";

function throwInvalidEtaConfig(reason: string): never {
  throw new Error(`Invalid ETA configuration: ${reason}`);
}

interface NormalizedStage {
  readonly weight: number; // normalized, sums to 1 across all stages
  readonly total: number;
}

function normalizeStages(stages: readonly IEtaStage[]): NormalizedStage[] {
  if (stages.length === 0) {
    throwInvalidEtaConfig("stages must not be empty");
  }
  let sum = 0;
  for (const stage of stages) {
    if (stage.weight < 0) {
      throwInvalidEtaConfig(`stage weight must be >= 0 (was ${stage.weight})`);
    }
    sum += stage.weight;
  }
  if (sum === 0) {
    throwInvalidEtaConfig("at least one stage must have a weight greater than 0");
  }
  return stages.map((stage) => ({ weight: stage.weight / sum, total: stage.total }));
}

function stageFraction(stage: NormalizedStage, completed: number): number {
  return stage.total > 0 ? completed / stage.total : 1;
}

/**
 * Backs both {@link IProgressEtaTrackBuilder}/{@link IProgressEtaTracker} (a single implicit
 * stage, `withKnownTotal`'s sugar - see {@link EtaTrackBuilder.withKnownTotal}) and
 * {@link IStagedProgressEtaTrackBuilder}/{@link IStagedProgressEtaTracker} - one implementation,
 * exposed through two narrower public types depending on which entry point built it.
 */
class ProgressEtaTracker<TDate> implements IStagedProgressEtaTracker {
  #runtime: IRuntime<TDate>;
  #stages: readonly NormalizedStage[];
  #notify: (snapshot: IStagedEtaProgressSnapshot) => void;
  #startTime: EpochMilliseconds;
  #currentStageIndex = 0;
  #stageCompleted = 0;
  #completedWeight = 0;
  #status: "in-progress" | "done" | "abandoned" = "in-progress";
  #rateEstimator: IRateEstimator;
  #timerHandle: IScheduledHandle;

  constructor(
    runtime: IRuntime<TDate>,
    stages: readonly NormalizedStage[],
    notificationIntervalMilliseconds: DurationMilliseconds,
    algorithm: EtaRateAlgorithm,
    notify: (snapshot: IStagedEtaProgressSnapshot) => void,
  ) {
    this.#runtime = runtime;
    this.#stages = stages;
    this.#notify = notify;
    this.#startTime = this.#runtime.clock.timestampNow();
    this.#rateEstimator = createRateEstimator(algorithm);
    this.#rateEstimator.addSample(this.#startTime, 0);
    this.#timerHandle = this.#runtime.timers.every(
      { milliseconds: notificationIntervalMilliseconds },
      () => this.#tick(),
    );
  }

  #overallFraction(): number {
    return (
      this.#completedWeight +
      stageFraction(this.#currentStage(), this.#stageCompleted) * this.#currentStage().weight
    );
  }

  #currentStage(): NormalizedStage {
    return this.#stages[this.#currentStageIndex]!;
  }

  #buildSnapshot(status: "in-progress" | "done" | "abandoned"): StagedEtaProgressSnapshot {
    const now = this.#runtime.clock.timestampNow();
    return new StagedEtaProgressSnapshot(
      status,
      this.#startTime,
      now,
      this.#stageCompleted,
      this.#currentStage().total,
      this.#currentStageIndex,
      this.#stages.length,
      this.#overallFraction(),
      this.#rateEstimator,
    );
  }

  #tick(): void {
    this.#notify(this.#buildSnapshot("in-progress"));
  }

  #recordSample(): void {
    this.#rateEstimator.addSample(this.#runtime.clock.timestampNow(), this.#overallFraction());
  }

  #terminate(status: "done" | "abandoned"): void {
    if (this.#status !== "in-progress") {
      return;
    }
    this.#status = status;
    this.#timerHandle.dispose();
    this.#notify(this.#buildSnapshot(status));
  }

  progress(chunkSize: number): void {
    this.#stageCompleted += chunkSize;
    this.#recordSample();
  }

  progressTo(completed: number): void {
    this.#stageCompleted = completed;
    this.#recordSample();
  }

  nextStage(): void {
    if (this.#currentStageIndex >= this.#stages.length - 1) {
      throw new Error("nextStage() called on the last stage - call done() instead");
    }
    // Snap the finishing stage to 100% and record that transition point *before* folding its
    // weight into completedWeight - doing it the other way round would double-count whatever
    // fraction of the finishing stage was already reported (its weight added once via
    // completedWeight, and again via the still-fractional stageCompleted/total for that same
    // stage).
    this.#stageCompleted = this.#currentStage().total;
    this.#recordSample();
    this.#completedWeight += this.#currentStage().weight;
    this.#currentStageIndex++;
    this.#stageCompleted = 0;
  }

  done(): void {
    // Regardless of which stage was current, "done" always means the whole job is complete: jump
    // straight to the last stage, fully finished, so the final snapshot reads as such.
    this.#currentStageIndex = this.#stages.length - 1;
    this.#stageCompleted = this.#currentStage().total;
    this.#completedWeight = 1 - this.#currentStage().weight;
    this.#terminate("done");
  }

  abandon(): void {
    this.#terminate("abandoned");
  }
}

class ProgressEtaTrackBuilder<TDate>
  implements IProgressEtaTrackBuilder, IStagedProgressEtaTrackBuilder
{
  #runtime: IRuntime<TDate>;
  #stages: readonly NormalizedStage[];
  #notificationIntervalMilliseconds = DEFAULT_NOTIFICATION_INTERVAL_MILLISECONDS;
  #algorithm: EtaRateAlgorithm = DEFAULT_ALGORITHM;

  constructor(runtime: IRuntime<TDate>, stages: readonly NormalizedStage[]) {
    this.#runtime = runtime;
    this.#stages = stages;
  }

  withNotificationInterval(milliseconds: DurationMilliseconds): this {
    this.#notificationIntervalMilliseconds =
      milliseconds < 0 ? (0 as DurationMilliseconds) : milliseconds;
    return this;
  }

  withAlgorithm(algorithm: EtaRateAlgorithm): this {
    this.#algorithm = algorithm;
    return this;
  }

  start(notify: (snapshot: IEtaProgressSnapshot) => void): IProgressEtaTracker;
  start(notify: (snapshot: IStagedEtaProgressSnapshot) => void): IStagedProgressEtaTracker;
  start(notify: (snapshot: never) => void): IStagedProgressEtaTracker {
    return new ProgressEtaTracker(
      this.#runtime,
      this.#stages,
      this.#notificationIntervalMilliseconds,
      this.#algorithm,
      notify as unknown as (snapshot: IStagedEtaProgressSnapshot) => void,
    );
  }
}

class DurationEtaTracker<TDate> implements IDurationEtaTracker {
  #runtime: IRuntime<TDate>;
  #notify: (snapshot: IEtaDurationSnapshot) => void;
  #startTime: EpochMilliseconds;
  #eta: EpochMilliseconds;
  #status: "in-progress" | "done" | "abandoned" = "in-progress";
  #timerHandle: IScheduledHandle;

  constructor(
    runtime: IRuntime<TDate>,
    expectedDurationMilliseconds: DurationMilliseconds,
    notificationIntervalMilliseconds: DurationMilliseconds,
    notify: (snapshot: IEtaDurationSnapshot) => void,
  ) {
    this.#runtime = runtime;
    this.#notify = notify;
    this.#startTime = this.#runtime.clock.timestampNow();
    this.#eta = epochArithmetic.addDuration(this.#startTime, expectedDurationMilliseconds);
    this.#timerHandle = this.#runtime.timers.every(
      { milliseconds: notificationIntervalMilliseconds },
      () =>
        this.#notify(
          new EtaDurationSnapshot(
            "in-progress",
            this.#startTime,
            this.#runtime.timestampNow(),
            this.#eta,
          ),
        ),
    );
  }

  #terminate(status: "done" | "abandoned"): void {
    if (this.#status !== "in-progress") {
      return;
    }
    this.#status = status;
    this.#timerHandle.dispose();

    const now = this.#runtime.clock.timestampNow();
    const eta = status === "done" ? now : undefined;
    this.#notify(new EtaDurationSnapshot(status, this.#startTime, now, eta));
  }

  done(): void {
    this.#terminate("done");
  }

  abandon(): void {
    this.#terminate("abandoned");
  }
}

class DurationEtaTrackBuilder<TDate> implements IDurationEtaTrackBuilder {
  #runtime: IRuntime<TDate>;
  #expectedDurationMilliseconds: DurationMilliseconds;
  #notificationIntervalMilliseconds = DEFAULT_NOTIFICATION_INTERVAL_MILLISECONDS;

  constructor(runtime: IRuntime<TDate>, expectedDurationMilliseconds: DurationMilliseconds) {
    this.#runtime = runtime;
    this.#expectedDurationMilliseconds = expectedDurationMilliseconds;
  }

  withNotificationInterval(milliseconds: DurationMilliseconds): this {
    this.#notificationIntervalMilliseconds =
      milliseconds < 0 ? (0 as DurationMilliseconds) : milliseconds;
    return this;
  }

  start(notify: (snapshot: IEtaDurationSnapshot) => void): IDurationEtaTracker {
    return new DurationEtaTracker(
      this.#runtime,
      this.#expectedDurationMilliseconds,
      this.#notificationIntervalMilliseconds,
      notify,
    );
  }
}

export class EtaTrackBuilder<TDate> implements IEtaTrackBuilder {
  #runtime: IRuntime<TDate>;

  constructor(runtime: IRuntime<TDate>) {
    this.#runtime = runtime;
  }

  withKnownTotal(total: number): IProgressEtaTrackBuilder {
    if (!(total >= 0)) {
      throwInvalidEtaConfig(`total must be >= 0 (was ${total})`);
    }
    return new ProgressEtaTrackBuilder(this.#runtime, [{ weight: 1, total }]);
  }

  withStages(stages: readonly IEtaStage[]): IStagedProgressEtaTrackBuilder {
    return new ProgressEtaTrackBuilder(this.#runtime, normalizeStages(stages));
  }

  withEstimatedDuration(
    expectedDurationMilliseconds: DurationMilliseconds,
  ): IDurationEtaTrackBuilder {
    if (!(expectedDurationMilliseconds >= 0)) {
      throwInvalidEtaConfig(
        `expectedDurationMilliseconds must be >= 0 (was ${expectedDurationMilliseconds})`,
      );
    }
    return new DurationEtaTrackBuilder(this.#runtime, expectedDurationMilliseconds);
  }
}
