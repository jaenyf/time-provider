/**
 * Tracks a pre-planned, in-order list of `advance()` deltas and hands them out one at a time.
 * Every adapter is driven by the same list (see Scenario.advanceDelaysMs) so their measured
 * workload is identical - only TimeProviderSequentialAdapter additionally needs the deltas
 * folded into absolute timestamps, since sequential mode can only be scripted up front via
 * the public `withSequentialTime()` builder.
 */
export class AdvanceDelayQueue {
  readonly #delaysMs: readonly number[];
  #nextIndex = 0;

  constructor(delaysMs: readonly number[]) {
    this.#delaysMs = delaysMs;
  }

  reset(): void {
    this.#nextIndex = 0;
  }

  next(): number {
    if (this.#nextIndex >= this.#delaysMs.length) {
      throw new Error(
        `advance() was called more times (call #${this.#nextIndex + 1}) than this adapter was ` +
          `pre-planned for (${this.#delaysMs.length} delay(s)). Pass a longer advanceDelaysMs list.`,
      );
    }
    return this.#delaysMs[this.#nextIndex++];
  }
}
