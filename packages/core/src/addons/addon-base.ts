import type { IAddon } from "../deterministic.ts";
import type { IDeterministicRuntime, IRuntime } from "../types/types.ts";

export abstract class AddonBase<
  TDate,
  TRuntime extends IRuntime<TDate> | IDeterministicRuntime<TDate>,
> implements IAddon<TDate> {
  #runtime!: TRuntime;
  #initialized: boolean;

  constructor() {
    this.#initialized = false;
  }

  get runtime(): TRuntime {
    if (!this.#initialized) {
      throw new Error("Add-on has not been initialized.");
    }
    return this.#runtime;
  }

  applyToRuntime(runtime: TRuntime): void {
    this.#runtime = runtime;
    this.applyToRuntimeImpl(runtime);
    this.#initialized = true;
  }

  protected abstract applyToRuntimeImpl(runtime: TRuntime): void;

  abstract dispose(): void;
  abstract isDisposed: boolean;
  abstract [Symbol.dispose](): void;
}
