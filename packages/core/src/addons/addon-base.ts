import type { IAddon } from "../deterministic.ts";
import type { IClock, IDeterministicRuntime, IRuntime, ITimers } from "../types/types.ts";

export abstract class AddonBase<
  TDate,
  TRuntime extends IRuntime<TDate> | IDeterministicRuntime<TDate>,
> implements IAddon<TDate> {
  #runtime!: TRuntime;
  #initialized: boolean;
  #timers?: ITimers;
  #clock?: IClock<TDate>;

  constructor() {
    this.#initialized = false;
  }

  get runtime(): TRuntime {
    if (!this.#initialized) {
      throw new Error("Add-on has not been initialized.");
    }
    return this.#runtime;
  }

  /**
   * This runtime's timers, resolved once. An addon reaches them through the `scheduler` facet
   * (`runtime.scheduler.timers`), so caching the result keeps a scheduling hot path from walking
   * that chain on every call.
   */
  protected get runtimeTimers(): ITimers {
    return (this.#timers ??= this.runtime.scheduler.timers);
  }

  /**
   * This runtime's clock, resolved once - see {@link runtimeTimers} for why it is cached.
   */
  protected get runtimeClock(): IClock<TDate> {
    return (this.#clock ??= this.runtime.clock);
  }

  applyToRuntime(runtime: TRuntime): void {
    this.#runtime = runtime;
    // Whatever was cached belongs to the previous runtime - see the accessors above.
    this.#timers = undefined;
    this.#clock = undefined;
    this.applyToRuntimeImpl(runtime);
    this.#initialized = true;
  }

  protected abstract applyToRuntimeImpl(runtime: TRuntime): void;

  abstract dispose(): void;
  abstract isDisposed: boolean;
  abstract [Symbol.dispose](): void;
}
