import { AddonBase, AddonHelper, type IRuntime } from "@time-provider/core";
import { EtaTrackBuilder } from "./eta-tracker.ts";
import type { IEtaApi, IEtaTrackBuilder } from "./types.ts";

export class EtaScheduler<TDate> extends AddonBase<TDate> implements IEtaApi<TDate> {
  #isDisposed: boolean;

  /**
   * @param timers the runtime's timers used to run notification ticks.
   * @param timestampNow reads the runtime's current time, in epoch milliseconds.
   */
  constructor() {
    super();
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

  protected applyToRuntimeImpl(runtime: IRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "eta",
      { estimate: this.estimate.bind(this) },
      this,
    );
  }

  estimate(): IEtaTrackBuilder {
    return new EtaTrackBuilder(this.runtime);
  }
}
