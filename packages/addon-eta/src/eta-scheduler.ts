import type { EpochMilliseconds, ITimers } from "@time-provider/core";
import { EtaTrackBuilder } from "./eta-tracker.ts";
import type { IEtaApi, IEtaTrackBuilder } from "./types.ts";

export class EtaScheduler implements IEtaApi {
  #timers: ITimers;
  #timestampNow: () => EpochMilliseconds;
  #isDisposed: boolean;

  /**
   * @param timers the runtime's scheduler used to run notification ticks.
   * @param timestampNow reads the runtime's current time, in epoch milliseconds.
   */
  constructor(timers: ITimers, timestampNow: () => EpochMilliseconds) {
    this.#timers = timers;
    this.#timestampNow = timestampNow;
    this.#isDisposed = false;
  }
  dispose(): void {
    this.#isDisposed = true;
  }
  get isDisposed(): boolean {
    return this.#isDisposed;
  }
  [Symbol.dispose](): void {
    this.dispose();
  }

  estimate(): IEtaTrackBuilder {
    return new EtaTrackBuilder(this.#timers, this.#timestampNow);
  }
}
