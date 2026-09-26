import type { IAddon } from "../deterministic.ts";
import type {
  IClock,
  IDeterministicRuntime,
  IMicrotasks,
  ITimings,
  IRuntime,
  ITimers,
} from "../types/types.ts";

/**
 * Base class for an addon: gives it access to the runtime it is attached to, once initialized.
 */
export abstract class AddonBase<
  TDate,
  TRuntime extends IRuntime<TDate> | IDeterministicRuntime<TDate>,
> implements IAddon<TDate> {
  #runtime!: TRuntime;
  #initialized: boolean;
  #timers?: ITimers;
  #clock?: IClock<TDate>;
  #microtasks?: IMicrotasks;
  #timings?: ITimings;

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

  /**
   * This runtime's microtasks, resolved once - see {@link runtimeTimers} for why it is cached.
   */
  protected get runtimeMicrotasks(): IMicrotasks {
    return (this.#microtasks ??= this.runtime.scheduler.microtasks);
  }

  /**
   * This runtime's timings, resolved once - see {@link runtimeTimers} for why it is cached.
   */
  protected get runtimeTimings(): ITimings {
    return (this.#timings ??= this.runtime.timings);
  }

  applyToRuntime(runtime: TRuntime): void {
    this.#runtime = runtime;
    // Whatever was cached belongs to the previous runtime - see the accessors above.
    this.#timers = undefined;
    this.#clock = undefined;
    this.#microtasks = undefined;
    this.#timings = undefined;
    this.applyToRuntimeImpl(runtime);
    this.#initialized = true;
  }

  protected abstract applyToRuntimeImpl(runtime: TRuntime): void;

  abstract dispose(): void;
  abstract isDisposed: boolean;
  abstract [Symbol.dispose](): void;
}
