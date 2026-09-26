import { AddonBase, AddonHelper, type IRuntime } from "@time-provider/core";
import { EtaTrackBuilder } from "./eta-tracker.ts";
import type { IEtaApi, IEtaTrackBuilder } from "./types.ts";

/**
 * The addon behind `timeProvider.eta`: starts ETA estimations against the runtime's clock.
 */
export class EtaScheduler<TDate>
  extends AddonBase<TDate, IRuntime<TDate>>
  implements IEtaApi<TDate>
{
  #isDisposed: boolean;

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
