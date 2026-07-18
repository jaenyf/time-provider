import type { IManualRuntime } from "../runtime/IManualRuntime.ts";
import type { IRuntime } from "../runtime/IRuntime.ts";
import type { IPlugin } from "./IPlugin.ts";

/**
 * Base class for plugin implementation
 */
export abstract class BasePlugin<TDate> implements IPlugin<TDate> {
  protected abstract readonly SystemRuntimeCtor: new () => IRuntime<TDate>;
  protected abstract readonly ManualRuntimeCtor: new (
    initialTime: string | number | TDate,
  ) => IManualRuntime<TDate>;
  protected abstract readonly FixedRuntimeCtor: new (
    initialTime: string | number | TDate,
  ) => IRuntime<TDate>;
  protected abstract readonly SequentialRuntimeCtor: new (
    sequentialTimes: (string | number | TDate)[],
  ) => IRuntime<TDate>;

  createSystemRuntime(): IRuntime<TDate> {
    return new this.SystemRuntimeCtor();
  }
  createManualRuntime(initialTime: string | number | TDate): IManualRuntime<TDate> {
    return new this.ManualRuntimeCtor(initialTime);
  }
  createFixedRuntime(initialTime: string | number | TDate): IRuntime<TDate> {
    return new this.FixedRuntimeCtor(initialTime);
  }
  createSequentialRuntime(sequentialTimes: (string | number | TDate)[]): IRuntime<TDate> {
    return new this.SequentialRuntimeCtor(sequentialTimes);
  }
}
