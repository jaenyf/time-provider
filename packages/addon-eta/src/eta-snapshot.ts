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
  rate: number | undefined,
): EpochMilliseconds | undefined {
  return rate !== undefined && rate > 0
    ? ((now + remaining / rate) as EpochMilliseconds)
    : undefined;
}

export class EtaProgressSnapshot implements IEtaProgressSnapshot {
  readonly status: EtaStatus;
  readonly startTime: EpochMilliseconds;
  readonly completed: number;
  readonly total: number;
  readonly elapsedMilliseconds: DurationMilliseconds;
  #remaining: Lazy<number>;
  #percentage: Lazy<number>;
  #rate: Lazy<number | undefined>;
  #eta: Lazy<EpochMilliseconds | undefined>;
  #remainingMilliseconds: Lazy<DurationMilliseconds | undefined>;

  constructor(
    status: EtaStatus,
    startTime: EpochMilliseconds,
    now: EpochMilliseconds,
    completed: number,
    total: number,
    rateEstimator: IRateEstimator | undefined,
  ) {
    this.status = status;
    this.startTime = startTime;
    this.completed = completed;
    this.total = total;
    this.elapsedMilliseconds = epochArithmetic.substract(now, startTime);
    this.#remaining = new Lazy(() => this.total - this.completed);
    this.#percentage = new Lazy(() => (this.total > 0 ? (this.completed / this.total) * 100 : 0));
    this.#rate = new Lazy(() => rateEstimator?.estimateRate());
    this.#eta = new Lazy(() =>
      status === "abandoned"
        ? undefined
        : estimateEta(now, this.#remaining.value, this.#rate.value),
    );
    this.#remainingMilliseconds = new Lazy(() => {
      const eta = this.#eta.value;
      return eta === undefined ? undefined : epochArithmetic.substract(eta, now);
    });
  }

  get remaining(): number {
    return this.#remaining.value;
  }
  get percentage(): number {
    return this.#percentage.value;
  }
  get rate(): number | undefined {
    return this.#rate.value;
  }
  get eta(): number | undefined {
    return this.#eta.value;
  }
  get remainingMilliseconds(): number | undefined {
    return this.#remainingMilliseconds.value;
  }
}

export class StagedEtaProgressSnapshot implements IEtaProgressSnapshot, IStagedEtaProgressSnapshot {
  readonly status: EtaStatus;
  readonly startTime: EpochMilliseconds;
  readonly stageCompleted: number;
  readonly stageTotal: number;
  readonly elapsedMilliseconds: DurationMilliseconds;
  readonly currentStageIndex: number;
  readonly stageCount: number;
  #stageRemaining: Lazy<number>;
  #stagePercentage: Lazy<number>;
  #rate: Lazy<number | undefined>;
  #eta: Lazy<number | undefined>;
  #remainingMilliseconds: Lazy<number | undefined>;

  constructor(
    status: EtaStatus,
    startTime: EpochMilliseconds,
    now: EpochMilliseconds,
    /** This stage's own raw completed/total - see {@link IStagedEtaProgressSnapshot}. */
    stageCompleted: number,
    stageTotal: number,
    currentStageIndex: number,
    stageCount: number,
    /** The overall (weighted, 0-1) fraction of the whole job completed so far. */
    overallFraction: number,
    overallRateEstimator: IRateEstimator | undefined,
  ) {
    this.status = status;
    this.startTime = startTime;
    this.stageCompleted = stageCompleted;
    this.stageTotal = stageTotal;
    this.elapsedMilliseconds = epochArithmetic.substract(now, startTime);
    this.currentStageIndex = currentStageIndex;
    this.stageCount = stageCount;
    this.#stageRemaining = new Lazy(() => this.stageTotal - this.stageCompleted);
    this.#stagePercentage = new Lazy(() =>
      this.stageTotal > 0 ? (this.stageCompleted / this.stageTotal) * 100 : 0,
    );
    this.#rate = new Lazy(() => overallRateEstimator?.estimateRate());
    this.#eta = new Lazy(() =>
      status === "abandoned" ? undefined : estimateEta(now, 1 - overallFraction, this.#rate.value),
    );
    this.#remainingMilliseconds = new Lazy(() => {
      const eta = this.#eta.value;
      return eta === undefined ? undefined : eta - now;
    });
  }

  get stageRemaining(): number {
    return this.#stageRemaining.value;
  }
  get stagePercentage(): number {
    return this.#stagePercentage.value;
  }
  /** {@link IEtaProgressSnapshot.completed} - aliases the current (only, for `withKnownTotal`)
   * stage's own value. */
  get completed(): number {
    return this.stageCompleted;
  }
  /** {@link IEtaProgressSnapshot.total} - aliases {@link stageTotal}. */
  get total(): number {
    return this.stageTotal;
  }
  /** {@link IEtaProgressSnapshot.remaining} - aliases {@link stageRemaining}. */
  get remaining(): number {
    return this.#stageRemaining.value;
  }
  /** {@link IEtaProgressSnapshot.percentage} - aliases {@link stagePercentage}. */
  get percentage(): number {
    return this.#stagePercentage.value;
  }
  /** Overall rate across every stage, in fraction-of-the-whole-job per millisecond. */
  get rate(): number | undefined {
    return this.#rate.value;
  }
  get eta(): number | undefined {
    return this.#eta.value;
  }
  get remainingMilliseconds(): number | undefined {
    return this.#remainingMilliseconds.value;
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
    eta: EpochMilliseconds | undefined,
  ) {
    this.status = status;
    this.startTime = startTime;
    this.elapsedMilliseconds = epochArithmetic.substract(now, startTime);
    this.eta = eta;
    this.remainingMilliseconds =
      eta === undefined ? undefined : epochArithmetic.substract(eta, now);
  }
}
