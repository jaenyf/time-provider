import type { IUtcOnlyManualRuntime } from "../runtime/IUtcOnlyManualRuntime.ts";
import type { IUtcOnlyRuntime } from "../runtime/IUtcOnlyRuntime.ts";
import type { IUtcOnlyPlugin } from "./IUtcOnlyPlugin.ts";

/**
 * Base class for plugin implementation backed by a timezone-naive date library (no `localNow`).
 */
export abstract class BaseUtcOnlyPlugin<TDate> implements IUtcOnlyPlugin<TDate> {
  readonly supportsLocalTime = false as const;

  protected abstract readonly SystemRuntimeCtor: new () => IUtcOnlyRuntime<TDate>;
  protected abstract readonly ManualRuntimeCtor: new (
    initialTime: string | number | TDate,
  ) => IUtcOnlyManualRuntime<TDate>;
  protected abstract readonly FixedRuntimeCtor: new (
    initialTime: string | number | TDate,
  ) => IUtcOnlyRuntime<TDate>;
  protected abstract readonly SequentialRuntimeCtor: new (
    sequentialTimes: (string | number | TDate)[],
  ) => IUtcOnlyRuntime<TDate>;

  createSystemRuntime(): IUtcOnlyRuntime<TDate> {
    return new this.SystemRuntimeCtor();
  }
  createManualRuntime(initialTime: string | number | TDate): IUtcOnlyManualRuntime<TDate> {
    return new this.ManualRuntimeCtor(initialTime);
  }
  createFixedRuntime(initialTime: string | number | TDate): IUtcOnlyRuntime<TDate> {
    return new this.FixedRuntimeCtor(initialTime);
  }
  createSequentialRuntime(sequentialTimes: (string | number | TDate)[]): IUtcOnlyRuntime<TDate> {
    return new this.SequentialRuntimeCtor(sequentialTimes);
  }
}
