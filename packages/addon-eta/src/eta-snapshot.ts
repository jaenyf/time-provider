import type {
  EtaStatus,
  IEtaDurationSnapshot,
  IEtaProgressSnapshot,
  IStagedEtaProgressSnapshot,
} from "./types.ts";
import type { IRateEstimator } from "./rate-estimator.ts";
import type { DurationMilliseconds, EpochMilliseconds } from "@time-provider/core";
import { epochArithmetic } from "@time-provider/core";

class Lazy<T> {
  #compute: () => T;
  #cache: { value: T } | undefined;

  constructor(compute: () => T) {
    this.#compute = compute;
  }

  get value(): T {
    this.#cache ??= { value: this.#compute() };
    return this.#cache.value;
  }
}

function estimateEta(
  now: EpochMilliseconds,
  remaining: number,
  rate = 0,
): EpochMilliseconds | undefined {
  return rate > 0 ? ((now + remaining / rate) as EpochMilliseconds) : undefined;
}

abstract class EstimatedSnapshot {
  readonly status: EtaStatus;
  readonly startTime: EpochMilliseconds;
  readonly elapsedMilliseconds: DurationMilliseconds;
  #rate: Lazy<number | undefined>;
  #eta: Lazy<EpochMilliseconds | undefined>;
  #remainingMilliseconds: Lazy<DurationMilliseconds | undefined>;

  constructor(
    status: EtaStatus,
    startTime: EpochMilliseconds,
    now: EpochMilliseconds,
    elapsedMilliseconds: DurationMilliseconds,
    remainingWork: number,
    rateEstimator: IRateEstimator | undefined,
  ) {
    this.status = status;
    this.startTime = startTime;
    this.elapsedMilliseconds = elapsedMilliseconds;
    this.#rate = new Lazy(() => rateEstimator?.estimateRate());
    this.#eta = new Lazy(() =>
      status === "abandoned" ? undefined : estimateEta(now, remainingWork, this.#rate.value),
    );
    this.#remainingMilliseconds = new Lazy(() => {
      const eta = this.#eta.value;
      return eta === undefined ? undefined : epochArithmetic.subtract(eta, now);
    });
  }

  get rate(): number | undefined {
    return this.#rate.value;
  }
  get eta(): EpochMilliseconds | undefined {
    return this.#eta.value;
  }
  get remainingMilliseconds(): DurationMilliseconds | undefined {
    return this.#remainingMilliseconds.value;
  }
}

export class EtaProgressSnapshot extends EstimatedSnapshot implements IEtaProgressSnapshot {
  readonly completed: number;
  readonly total: number;
  #remaining: Lazy<number>;
  #percentage: Lazy<number>;

  constructor(
    status: EtaStatus,
    startTime: EpochMilliseconds,
    now: EpochMilliseconds,
    elapsedMilliseconds: DurationMilliseconds,
    completed: number,
    total: number,
    rateEstimator: IRateEstimator | undefined,
  ) {
    super(status, startTime, now, elapsedMilliseconds, total - completed, rateEstimator);
    this.completed = completed;
    this.total = total;
    this.#remaining = new Lazy(() => this.total - this.completed);
    this.#percentage = new Lazy(() => (this.total > 0 ? (this.completed / this.total) * 100 : 0));
  }

  get remaining(): number {
    return this.#remaining.value;
  }
  get percentage(): number {
    return this.#percentage.value;
  }
}

export class StagedEtaProgressSnapshot
  extends EstimatedSnapshot
  implements IEtaProgressSnapshot, IStagedEtaProgressSnapshot
{
  readonly stageCompleted: number;
  readonly stageTotal: number;
  readonly currentStageIndex: number;
  readonly stageCount: number;
  #stageRemaining: Lazy<number>;
  #stagePercentage: Lazy<number>;

  constructor(
    status: EtaStatus,
    startTime: EpochMilliseconds,
    now: EpochMilliseconds,
    elapsedMilliseconds: DurationMilliseconds,
    /** Current stage's raw completed/total. */
    stageCompleted: number,
    stageTotal: number,
    currentStageIndex: number,
    stageCount: number,
    /** Overall weighted completion fraction. */
    overallFraction: number,
    overallRateEstimator: IRateEstimator | undefined,
  ) {
    super(status, startTime, now, elapsedMilliseconds, 1 - overallFraction, overallRateEstimator);
    this.stageCompleted = stageCompleted;
    this.stageTotal = stageTotal;
    this.currentStageIndex = currentStageIndex;
    this.stageCount = stageCount;
    this.#stageRemaining = new Lazy(() => this.stageTotal - this.stageCompleted);
    this.#stagePercentage = new Lazy(() =>
      this.stageTotal > 0 ? (this.stageCompleted / this.stageTotal) * 100 : 0,
    );
  }

  get stageRemaining(): number {
    return this.#stageRemaining.value;
  }
  get stagePercentage(): number {
    return this.#stagePercentage.value;
  }
  /** {@link IEtaProgressSnapshot.completed}; aliases `stageCompleted`. */
  get completed(): number {
    return this.stageCompleted;
  }
  /** {@link IEtaProgressSnapshot.total}; aliases {@link stageTotal}. */
  get total(): number {
    return this.stageTotal;
  }
  /** {@link IEtaProgressSnapshot.remaining}; aliases {@link stageRemaining}. */
  get remaining(): number {
    return this.#stageRemaining.value;
  }
  /** {@link IEtaProgressSnapshot.percentage}; aliases {@link stagePercentage}. */
  get percentage(): number {
    return this.#stagePercentage.value;
  }
}

export class EtaDurationSnapshot implements IEtaDurationSnapshot {
  readonly status: EtaStatus;
  readonly startTime: EpochMilliseconds;
  readonly elapsedMilliseconds: DurationMilliseconds;
  readonly eta?: EpochMilliseconds;
  readonly remainingMilliseconds?: DurationMilliseconds;

  constructor(
    status: EtaStatus,
    startTime: EpochMilliseconds,
    now: EpochMilliseconds,
    elapsedMilliseconds: DurationMilliseconds,
    eta: EpochMilliseconds | undefined,
  ) {
    this.status = status;
    this.startTime = startTime;
    this.elapsedMilliseconds = elapsedMilliseconds;
    this.eta = eta;
    this.remainingMilliseconds = eta === undefined ? undefined : epochArithmetic.subtract(eta, now);
  }
}
