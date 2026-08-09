import type { EtaRateAlgorithm } from "./types.ts";

/**
 * Estimates a completion rate (tracked units per millisecond) from a stream of `(time, done)`
 * samples, per the chosen {@link EtaRateAlgorithm}. Internal - not part of the public API.
 */
export interface IRateEstimator {
  addSample(time: number, done: number): void;
  /** `undefined` until enough samples have been seen to estimate a rate. */
  estimateRate(): number | undefined;
}

interface Sample {
  readonly time: number;
  readonly done: number;
}

/** `"complete"` - only ever needs the very first sample and the latest one. */
class CompleteRateEstimator implements IRateEstimator {
  #first: Sample | undefined;
  #latest: Sample | undefined;

  addSample(time: number, done: number): void {
    this.#first ??= { time, done };
    this.#latest = { time, done };
  }

  estimateRate(): number | undefined {
    if (!this.#first || !this.#latest || this.#latest.time === this.#first.time) {
      return undefined;
    }
    return (this.#latest.done - this.#first.done) / (this.#latest.time - this.#first.time);
  }
}

// How far back "windowed" looks. A time span, not a sample count, so the window represents a
// consistent amount of real time regardless of how often progress happens to be reported.
const WINDOWED_DURATION_MS = 10_000;

/** `"windowed"` - only considers samples from the last {@link WINDOWED_DURATION_MS}. */
class WindowedRateEstimator implements IRateEstimator {
  #samples: Sample[] = [];

  addSample(time: number, done: number): void {
    this.#samples.push({ time, done });
    while (this.#samples.length > 2 && this.#samples[1]!.time < time - WINDOWED_DURATION_MS) {
      this.#samples.shift();
    }
  }

  estimateRate(): number | undefined {
    if (this.#samples.length < 2) {
      return undefined;
    }
    const first = this.#samples[0]!;
    const latest = this.#samples[this.#samples.length - 1]!;
    if (latest.time === first.time) {
      return undefined;
    }
    return (latest.done - first.done) / (latest.time - first.time);
  }
}

// How heavily each new sample's instantaneous rate is weighted into the running estimate - a
// classic exponential moving average smoothing constant.
const SMOOTHING_FACTOR = 0.3;

/** `"smoothed"` - a running average blending each new sample into the previous estimate. */
class SmoothedRateEstimator implements IRateEstimator {
  #previous: Sample | undefined;
  #rate: number | undefined;

  addSample(time: number, done: number): void {
    if (this.#previous && time > this.#previous.time) {
      const instantaneous = (done - this.#previous.done) / (time - this.#previous.time);
      this.#rate =
        this.#rate === undefined
          ? instantaneous
          : SMOOTHING_FACTOR * instantaneous + (1 - SMOOTHING_FACTOR) * this.#rate;
    }
    this.#previous = { time, done };
  }

  estimateRate(): number | undefined {
    return this.#rate;
  }
}

export function createRateEstimator(algorithm: EtaRateAlgorithm): IRateEstimator {
  switch (algorithm) {
    case "complete":
      return new CompleteRateEstimator();
    case "windowed":
      return new WindowedRateEstimator();
    case "smoothed":
      return new SmoothedRateEstimator();
  }
}
