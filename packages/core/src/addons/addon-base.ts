import type { IAddon } from "../deterministic.ts";
import type { IRuntime } from "../types/types.ts";

export abstract class AddonBase<TDate> implements IAddon<TDate> {
  #runtime!: IRuntime<TDate>;
  #initialized: boolean;

  constructor() {
    this.#initialized = false;
  }

  get runtime(): IRuntime<TDate> {
    if (!this.#initialized) {
      throw new Error("Add-on has not been initialized.");
    }
    return this.#runtime;
  }

  applyToRuntime(runtime: IRuntime<TDate>): void {
    this.applyToRuntimeImpl(runtime);
    this.#runtime = runtime;
    this.#initialized = true;
  }

  protected abstract applyToRuntimeImpl(runtime: IRuntime<TDate>): void;
  abstract clone(): this;

  abstract dispose(): void;
  abstract isDisposed: boolean;
  abstract [Symbol.dispose](): void;
}
