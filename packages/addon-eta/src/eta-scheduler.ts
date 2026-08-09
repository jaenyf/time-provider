import type { IScheduler } from "@time-provider/core";
import { EtaTrackBuilder } from "./eta-tracker.ts";
import type { IEtaApi, IEtaTrackBuilder } from "./types.ts";

export class EtaScheduler implements IEtaApi {
  #scheduler: IScheduler;
  #timestampNow: () => number;

  /**
   * @param scheduler the runtime's scheduler used to run notification ticks.
   * @param timestampNow reads the runtime's current time, in epoch milliseconds.
   */
  constructor(scheduler: IScheduler, timestampNow: () => number) {
    this.#scheduler = scheduler;
    this.#timestampNow = timestampNow;
  }

  estimate(): IEtaTrackBuilder {
    return new EtaTrackBuilder(this.#scheduler, this.#timestampNow);
  }
}
